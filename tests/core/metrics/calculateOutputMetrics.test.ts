import { describe, expect, it } from 'vitest';
import { calculateOutputMetrics } from '../../../src/core/metrics/calculateOutputMetrics.js';

describe('calculateOutputMetrics', () => {
  it('should calculate metrics for output content', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const path = 'test.txt';

    const result = await calculateOutputMetrics(content, encoding, path);

    expect(result).toBe(2); // 'test content' should be counted as 2 tokens
  });

  it('should work without a specified path', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined);

    expect(result).toBe(2);
  });

  it('should handle empty content', async () => {
    const content = '';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined);

    expect(result).toBe(0);
  });

  it('should work with longer complex content', async () => {
    const content = 'This is a longer test content with multiple sentences. It should work correctly.';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined);

    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('should handle large content correctly', async () => {
    // Generate moderately large content to verify correctness without excessive runtime
    const content = 'a'.repeat(10_000); // 10KB of content
    const encoding = 'o200k_base';
    const path = 'large-file.txt';

    const result = await calculateOutputMetrics(content, encoding, path);

    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });
});
