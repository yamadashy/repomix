import { describe, expect, test } from 'vitest';
import { validateTokenBudget } from '../../src/cli/cliTokenBudget.js';
import { RepomixError } from '../../src/shared/errorHandle.js';

describe('validateTokenBudget', () => {
  test('does nothing when no budget is set', () => {
    expect(() => validateTokenBudget(1_000_000, undefined)).not.toThrow();
  });

  test('does nothing when the total is within budget', () => {
    expect(() => validateTokenBudget(100, 200)).not.toThrow();
  });

  test('does nothing when the total exactly equals the budget', () => {
    expect(() => validateTokenBudget(200, 200)).not.toThrow();
  });

  test('throws a RepomixError when the total exceeds the budget', () => {
    expect(() => validateTokenBudget(250, 200)).toThrow(RepomixError);
  });

  test('includes the actual and budget token counts in the message', () => {
    expect(() => validateTokenBudget(243512, 180000)).toThrow(/243,512 > 180,000 tokens/);
  });
});
