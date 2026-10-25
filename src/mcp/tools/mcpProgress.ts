import { stripVTControlCharacters } from 'node:util';
import type { ServerContext } from '@modelcontextprotocol/server';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';

/** The slice of the SDK request context the reporter needs (narrow for testability). */
export type McpProgressContext = {
  mcpReq: Pick<ServerContext['mcpReq'], '_meta' | 'notify'> & { signal?: AbortSignal };
};

export type McpProgressReporter = { report: RepomixProgressCallback; stop: () => void };

/** Minimum gap between two notifications that do not start a new stage (max ~4/sec). */
export const PROGRESS_THROTTLE_MS = 250;

// A stage is the leading "Verb noun..." of a pipeline message, e.g. "Processing file..."
// in "Processing file... (3/10) src/a.ts". Stage heads are code literals, so a head made
// only of letters and spaces cannot carry a path.
const STAGE_PATTERN = /^[A-Za-z ]+\.\.\./;
const COUNTER_PATTERN = /\((\d+)\/(\d+)\)/;
const FALLBACK_STAGE = 'Packing...';

// Messages without a recognisable stage head share one fixed stage, so they are throttled
// together instead of each one counting as a new stage.
const stageOf = (message: string): string => message.match(STAGE_PATTERN)?.[0] ?? FALLBACK_STAGE;

// A "(n/n)" counter marks the last update of a stage. It is always sent so a client's
// counter does not stall short of the total when the throttle drops it.
const isStageComplete = (message: string): boolean => {
  const counter = message.match(COUNTER_PATTERN);
  return counter !== null && counter[1] === counter[2];
};

/**
 * Sandbox-safe rendering: only the literal stage head plus a numeric "(n/total)"
 * counter survive. Everything else in the pipeline message (file paths, split-part
 * root entries, ...) is dropped, and a message without a recognisable stage head
 * collapses to a fixed string, so no host path can reach the untrusted agent.
 */
const toSandboxMessage = (message: string): string => {
  const stage = message.match(STAGE_PATTERN)?.[0];
  if (!stage) return FALLBACK_STAGE;
  const counter = message.slice(stage.length).match(COUNTER_PATTERN);
  return counter ? `${stage} (${counter[1]}/${counter[2]})` : stage;
};

/**
 * Build a pipeline progress callback that forwards messages to the MCP client as
 * `notifications/progress`. Returns undefined when the client did not supply a
 * progressToken, so nothing is sent unless asked for.
 *
 * - `progress` is a per-request counter incremented on every sent notification, so it
 *   strictly increases across stages; `total` is omitted because the number of
 *   updates is not known up front.
 * - Throttled: the first and the final ("(n/n)") message of each stage are always sent;
 *   any other message only when PROGRESS_THROTTLE_MS has passed since the last notification. Stages that run
 *   concurrently (e.g. security check and file processing) interleave their messages,
 *   so "new stage" means first seen, not merely different from the previous one.
 * - Notification failures (closed transport, ...) are swallowed: progress is best
 *   effort and must never fail the tool call.
 * - `stop()` silences the reporter. The pipeline can keep emitting after the tool has
 *   already responded (e.g. a concurrent stage still running when another one threw),
 *   and progress for a completed request must not be sent. The reporter is also silent
 *   once the request's abort signal fires (client cancellation or disconnect).
 */
export const createMcpProgressReporter = (
  ctx: McpProgressContext | undefined,
  options: { sandboxed: boolean },
  deps = { now: () => Date.now() },
): McpProgressReporter | undefined => {
  const progressToken = ctx?.mcpReq._meta?.progressToken;
  if (progressToken === undefined) return undefined;

  let progress = 0;
  const seenStages = new Set<string>();
  let lastSentAt = Number.NEGATIVE_INFINITY;
  let stopped = false;

  const report: RepomixProgressCallback = (rawMessage) => {
    // A cancelled request gets no further progress, even while the pack winds down.
    if (stopped || ctx?.mcpReq.signal?.aborted) return;
    try {
      const message = stripVTControlCharacters(rawMessage).trim();
      const stage = stageOf(message);
      const now = deps.now();
      if (seenStages.has(stage) && !isStageComplete(message) && now - lastSentAt < PROGRESS_THROTTLE_MS) return;
      seenStages.add(stage);
      lastSentAt = now;
      progress += 1;

      ctx?.mcpReq
        .notify({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress,
            message: options.sandboxed ? toSandboxMessage(message) : message,
          },
        })
        .catch((error) => logger.trace('Failed to send MCP progress notification:', error));
    } catch (error) {
      logger.trace('Failed to send MCP progress notification:', error);
    }
  };

  return {
    report,
    stop: () => {
      stopped = true;
    },
  };
};

/**
 * Run a pack with MCP progress reporting and stop reporting once it settles, so no
 * notification can follow the tool's response for this request.
 */
export const withMcpProgress = async <T>(
  ctx: McpProgressContext | undefined,
  options: { sandboxed: boolean },
  run: (progressCallback?: RepomixProgressCallback) => Promise<T>,
): Promise<T> => {
  const reporter = createMcpProgressReporter(ctx, options);
  try {
    return await run(reporter?.report);
  } finally {
    reporter?.stop();
  }
};
