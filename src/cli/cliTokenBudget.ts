import { RepomixError } from '../shared/errorHandle.js';

/**
 * Throws a RepomixError when the packed output exceeds the configured token budget.
 * A no-op when no budget is set (undefined) or the total is within budget.
 *
 * Enforced by the top-level CLI flow (runCli) after the chosen action has fully
 * produced and delivered its output — written locally, or copied out of the
 * remote temp directory. This makes it a guard that fails the run with a
 * non-zero exit code (not an in-pack fail-fast), behaving consistently for both
 * local and --remote runs.
 */
export const validateTokenBudget = (totalTokens: number, tokenBudget: number | undefined): void => {
  if (tokenBudget === undefined || totalTokens <= tokenBudget) {
    return;
  }

  throw new RepomixError(
    `Packed output exceeds the token budget: ${totalTokens.toLocaleString()} > ${tokenBudget.toLocaleString()} tokens. ` +
      'Reduce the output with --compress, narrow the scope with --include/--ignore, or raise --token-budget.',
  );
};
