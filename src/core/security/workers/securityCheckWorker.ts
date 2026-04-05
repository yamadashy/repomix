import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { SecurityCheckItem, SuspiciousFileResult } from '../secretLintRunner.js';
import { createSecretLintConfig, runSecretLint } from '../secretLintRunner.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export type { SecurityCheckItem, SecurityCheckType, SuspiciousFileResult } from '../secretLintRunner.js';
export { createSecretLintConfig, runSecretLint } from '../secretLintRunner.js';

export interface SecurityCheckTask {
  items: SecurityCheckItem[];
}

// Cache config at module level - created once per worker, reused for all tasks
const cachedConfig = createSecretLintConfig();

export default async (task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
  const config = cachedConfig;
  const processStartAt = process.hrtime.bigint();

  try {
    const results: (SuspiciousFileResult | null)[] = [];
    for (const item of task.items) {
      results.push(await runSecretLint(item.filePath, item.content, item.type, config));
    }

    const processEndAt = process.hrtime.bigint();
    logger.trace(
      `Checked security on ${task.items.length} items. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
    );

    return results;
  } catch (error) {
    logger.error('Error in security check worker:', error);
    throw error;
  }
};

// Export cleanup function for Tinypool teardown (no cleanup needed for this worker)
export const onWorkerTermination = async (): Promise<void> => {
  // No cleanup needed for security check worker
};
