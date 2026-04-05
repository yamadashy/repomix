import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

// Target ~100KB per chunk so that each worker task does meaningful tokenization work.
// Previously this was 1000 (number of chunks), which created ~1KB chunks for 1MB output,
// causing ~1000 worker round-trips with ~0.5ms overhead each (~500ms total waste).
const TARGET_CHARS_PER_CHUNK = 100_000;
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

// Sampling constants for token count estimation on large outputs.
// Instead of full BPE tokenization, we sample evenly spaced portions and extrapolate.
// Threshold must be well above MIN_CONTENT_LENGTH_FOR_PARALLEL (1MB) so that sampling
// (10 worker calls) is significantly fewer than full parallel chunking (30+ chunks).
const OUTPUT_SAMPLING_THRESHOLD = 3_000_000; // 3MB - outputs below this are fully tokenized
const OUTPUT_SAMPLE_SIZE = 100_000; // 100KB per sample
const OUTPUT_SAMPLE_COUNT = 10; // Number of evenly spaced samples
// Maximum coefficient of variation allowed for sampling estimation.
// If per-sample chars/token ratios vary more than this (e.g. mixed CJK/ASCII content,
// or periodic structure resonating with the stride), fall back to full tokenization.
const SAMPLING_CV_THRESHOLD = 0.15;

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<number> => {
  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    let result: number;

    if (content.length > OUTPUT_SAMPLING_THRESHOLD) {
      // For very large outputs, try sampling estimation first
      const estimated = await tryEstimateBySampling(content, encoding, path, deps);
      if (estimated !== null) {
        result = estimated;
      } else {
        // Sampling variance too high, fall back to full tokenization
        result = await fullTokenize(content, encoding, path, deps);
      }
    } else {
      // Standard path: full tokenization (parallel for > 1MB, direct for smaller)
      result = await fullTokenize(content, encoding, path, deps);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Output token count completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during token count:', error);
    throw error;
  }
};

/**
 * Full tokenization: split content into chunks and process in parallel, or directly for smaller content.
 */
const fullTokenize = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<number> => {
  if (content.length > MIN_CONTENT_LENGTH_FOR_PARALLEL) {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += TARGET_CHARS_PER_CHUNK) {
      chunks.push(content.slice(i, i + TARGET_CHARS_PER_CHUNK));
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk, index) =>
        deps.taskRunner.run({
          content: chunk,
          encoding,
          path: path ? `${path}-chunk-${index}` : undefined,
        }),
      ),
    );

    return chunkResults.reduce((sum, count) => sum + count, 0);
  }

  return deps.taskRunner.run({ content, encoding, path });
};

/**
 * Try to estimate token count by sampling evenly spaced portions of the content.
 * Returns the estimated count, or null if the sample variance is too high
 * (indicating heterogeneous content where sampling would be inaccurate).
 */
const tryEstimateBySampling = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<number | null> => {
  const sampleCount = Math.min(OUTPUT_SAMPLE_COUNT, Math.ceil(content.length / OUTPUT_SAMPLE_SIZE));
  if (sampleCount < 2) {
    return null;
  }

  const stride = Math.floor(content.length / sampleCount);

  const sampleResults = await Promise.all(
    Array.from({ length: sampleCount }, (_, i) => {
      const start = i * stride;
      const sampleContent = content.slice(start, start + OUTPUT_SAMPLE_SIZE);
      return deps.taskRunner
        .run({
          content: sampleContent,
          encoding,
          path: path ? `${path}-sample-${i}` : undefined,
        })
        .then((tokens) => ({ chars: sampleContent.length, tokens }));
    }),
  );

  const validSamples = sampleResults.filter((s) => s.tokens > 0 && s.chars > 0);
  if (validSamples.length < 2) {
    return null;
  }

  // Compute per-sample chars/token ratios and check coefficient of variation (CV = stddev / mean).
  // High CV indicates the content is heterogeneous (e.g. mixed CJK/ASCII, or periodic structure
  // resonating with the sample stride), making the extrapolation unreliable.
  const ratios = validSamples.map((s) => s.chars / s.tokens);
  const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  const variance = ratios.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratios.length;
  const cv = Math.sqrt(variance) / mean;

  if (cv > SAMPLING_CV_THRESHOLD) {
    logger.trace(
      `Sampling CV ${cv.toFixed(3)} exceeds threshold ${SAMPLING_CV_THRESHOLD}, falling back to full tokenization`,
    );
    return null;
  }

  // Extrapolate total token count from the overall sample ratio
  const totalSampleTokens = validSamples.reduce((sum, s) => sum + s.tokens, 0);
  const totalSampleChars = validSamples.reduce((sum, s) => sum + s.chars, 0);
  const estimated = Math.round((content.length / totalSampleChars) * totalSampleTokens);

  logger.trace(
    `Estimated output tokens from ${validSamples.length} samples: ${estimated} (CV=${cv.toFixed(3)}, ${(totalSampleChars / totalSampleTokens).toFixed(2)} chars/token)`,
  );

  return estimated;
};
