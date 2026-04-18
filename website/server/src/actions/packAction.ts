import zlib from 'node:zlib';
import type { Context } from 'hono';
import { stream } from 'hono/streaming';
import { processZipFile } from '../domains/pack/processZipFile.js';
import { processRemoteRepo } from '../domains/pack/remoteRepo.js';
import { sanitizePattern } from '../domains/pack/utils/validation.js';
import type { PackProgressStage, ProcessPackResult } from '../types.js';
import { getClientInfo } from '../utils/clientInfo.js';
import { createErrorResponse } from '../utils/http.js';
import { logError, logInfo } from '../utils/logger.js';
import { calculateMemoryDiff, getMemoryUsage } from '../utils/memory.js';
import { formatLatencyForDisplay } from '../utils/time.js';
import { validateRequest } from '../utils/validation.js';
import { classifyRejectReason, getRepoHost, PACK_EVENT, type PackOutcome } from './packEventSchema.js';
import { type PackRequest, packRequestSchema } from './packRequestSchema.js';

export const packAction = async (c: Context) => {
  // Extracted up-front so validation_error logs can attach `source` for the
  // pack_requests metric label; clientInfo doesn't depend on validated input.
  const clientInfo = getClientInfo(c);

  // Parse and validate request before starting stream
  let validatedData: PackRequest;
  let sanitizedOptions: { includePatterns?: string; ignorePatterns?: string } & Record<string, unknown>;

  try {
    const formData = await c.req.formData();

    // Get form data
    const format = formData.get('format') as 'xml' | 'markdown' | 'plain';
    const optionsRaw = formData.get('options') as string | null;
    let options: unknown = {};
    try {
      options = optionsRaw ? JSON.parse(optionsRaw) : {};
    } catch (jsonError) {
      // Preserve the original SyntaxError so the log has position / token
      // context — just the invalid_json count without the cause makes the
      // invalid_json bucket unactionable when it spikes.
      logError(
        'Pack validation failed',
        jsonError instanceof Error ? jsonError : new Error('Invalid JSON in options'),
        {
          event: PACK_EVENT,
          outcome: 'validation_error' satisfies PackOutcome,
          rejectReason: 'invalid_json',
          requestId: c.get('requestId'),
          source: clientInfo.source,
        },
      );
      return c.json(createErrorResponse('Invalid JSON in options', c.get('requestId')), 400);
    }
    const file = formData.get('file') as File | null;
    const url = formData.get('url') as string | null;

    // Validate and sanitize request data
    validatedData = validateRequest(packRequestSchema, {
      url: url || undefined,
      file: file || undefined,
      format,
      options,
    });

    const sanitizedIncludePatterns = sanitizePattern(validatedData.options.includePatterns);
    const sanitizedIgnorePatterns = sanitizePattern(validatedData.options.ignorePatterns);

    sanitizedOptions = {
      ...validatedData.options,
      includePatterns: sanitizedIncludePatterns,
      ignorePatterns: sanitizedIgnorePatterns,
    };
  } catch (error) {
    logError('Pack validation failed', error instanceof Error ? error : new Error('Unknown error'), {
      event: PACK_EVENT,
      outcome: 'validation_error' satisfies PackOutcome,
      rejectReason: classifyRejectReason(error),
      requestId: c.get('requestId'),
      source: clientInfo.source,
    });

    const { handlePackError } = await import('../utils/errorHandler.js');
    const appError = handlePackError(error);
    return c.json(createErrorResponse(appError.message, c.get('requestId')), appError.statusCode);
  }

  const requestId = c.get('requestId');
  const inputType: 'file' | 'url' = validatedData.file ? 'file' : 'url';
  const repoHost = getRepoHost({ file: validatedData.file, url: validatedData.url });
  // Booleans flattened for log-based metric extraction. Patterns are logged
  // as presence-only booleans to avoid high cardinality and user input leakage.
  // Computed once so both success and pack_error logs can include it — OOMs
  // typically land in pack_error, so logging options only on success would
  // create survivorship bias for OOM investigation.
  //
  // `Boolean()` intentionally collapses `undefined` (user didn't send the
  // field) into `false`. The metric is designed to answer "what % of packs
  // had compress enabled" — both "user disabled" and "user didn't send"
  // mean the feature wasn't active, which is the signal we want.
  const packOptions = {
    compress: Boolean(validatedData.options.compress),
    removeComments: Boolean(validatedData.options.removeComments),
    removeEmptyLines: Boolean(validatedData.options.removeEmptyLines),
    showLineNumbers: Boolean(validatedData.options.showLineNumbers),
    fileSummary: Boolean(validatedData.options.fileSummary),
    directoryStructure: Boolean(validatedData.options.directoryStructure),
    outputParsable: Boolean(validatedData.options.outputParsable),
    hasIncludePatterns: Boolean(validatedData.options.includePatterns),
    hasIgnorePatterns: Boolean(validatedData.options.ignorePatterns),
  };

  // Stream NDJSON with per-line gzip flush. Bypasses hono/compress (which uses
  // Web CompressionStream and cannot flush mid-stream) by pre-setting
  // Content-Encoding, and uses Node zlib with Z_SYNC_FLUSH after every write
  // so progress events reach the client immediately while the large final
  // result still benefits from compression.
  c.header('Content-Type', 'application/x-ndjson; charset=utf-8');
  c.header('Content-Encoding', 'gzip');
  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('X-Accel-Buffering', 'no');

  return stream(c, async (s) => {
    const gzip = zlib.createGzip();
    // Required: without an 'error' listener, a zlib error would crash the
    // Node process via unhandled EventEmitter error.
    gzip.on('error', (err) => {
      logError('Gzip compression error', err instanceof Error ? err : new Error(String(err)), {
        requestId,
      });
    });

    // Serialize downstream writes via a promise chain so each compressed chunk
    // is awaited before the next, bounding memory under slow-client backpressure.
    let writeChain: Promise<unknown> = Promise.resolve();
    gzip.on('data', (chunk: Buffer) => {
      writeChain = writeChain.then(() => s.write(chunk));
    });

    const writeLine = async (data: unknown) => {
      const line = `${JSON.stringify(data)}\n`;
      await new Promise<void>((resolve, reject) => {
        gzip.write(line, (err) => (err ? reject(err) : resolve()));
      });
      // zlib flush callback signature is () => void; errors surface via the
      // 'error' event listener registered above.
      await new Promise<void>((resolve) => {
        gzip.flush(zlib.constants.Z_SYNC_FLUSH, () => resolve());
      });
      await writeChain;
    };

    // Declared outside the try so the catch path can also report durationMs.
    const startTime = Date.now();

    try {
      const THROTTLE_MS = 200;
      let lastProgressTime = 0;
      let lastStage: PackProgressStage | null = null;

      const sendProgress = async (stage: PackProgressStage, message?: string) => {
        const now = Date.now();
        const stageChanged = stage !== lastStage;

        // Always send immediately when stage changes; throttle within same stage
        if (!stageChanged && now - lastProgressTime < THROTTLE_MS) {
          return;
        }

        lastProgressTime = now;
        lastStage = stage;
        await writeLine({ type: 'progress', stage, ...(message && { message }) });
      };

      const beforeMemory = getMemoryUsage();

      // Process file or repository with progress reporting
      let processResult: ProcessPackResult;
      if (validatedData.file) {
        processResult = await processZipFile(validatedData.file, validatedData.format, sanitizedOptions, sendProgress);
      } else {
        processResult = await processRemoteRepo(
          validatedData.url as string,
          validatedData.format,
          sanitizedOptions,
          sendProgress,
        );
      }
      const { result, cached } = processResult;

      // Log operation result with memory usage
      const afterMemory = getMemoryUsage();
      const memoryDiff = calculateMemoryDiff(beforeMemory, afterMemory);

      logInfo('Pack operation completed', {
        event: PACK_EVENT,
        outcome: 'success' satisfies PackOutcome,
        requestId,
        format: validatedData.format,
        inputType,
        repoHost,
        cached,
        source: clientInfo.source,
        durationMs: Date.now() - startTime,
        repository: result.metadata.repository,
        duration: formatLatencyForDisplay(startTime),
        packOptions,
        clientInfo: {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        },
        memory: {
          before: beforeMemory,
          after: afterMemory,
          diff: memoryDiff,
        },
        metrics: {
          totalFiles: result.metadata.summary?.totalFiles,
          totalCharacters: result.metadata.summary?.totalCharacters,
          totalTokens: result.metadata.summary?.totalTokens,
        },
      });

      // Send the final result
      await writeLine({ type: 'result', data: result });
    } catch (error) {
      logError('Pack operation failed', error instanceof Error ? error : new Error('Unknown error'), {
        event: PACK_EVENT,
        outcome: 'pack_error' satisfies PackOutcome,
        requestId,
        format: validatedData.format,
        inputType,
        repoHost,
        source: clientInfo.source,
        durationMs: Date.now() - startTime,
        packOptions,
      });

      const { handlePackError } = await import('../utils/errorHandler.js');
      const appError = handlePackError(error);

      await writeLine({ type: 'error', message: appError.message });
    } finally {
      await new Promise<void>((resolve) => gzip.end(() => resolve()));
      await writeChain;
    }
  });
};
