import { describe, expect, test, vi } from 'vitest';
import { createSafeProgressCallback } from '../../src/shared/progressCallback.js';

describe('createSafeProgressCallback', () => {
  test('forwards messages to the callback', () => {
    const callback = vi.fn();
    createSafeProgressCallback(callback)('Packing...');
    expect(callback).toHaveBeenCalledWith('Packing...');
  });

  test('is a no-op without a callback', () => {
    expect(() => createSafeProgressCallback()('Packing...')).not.toThrow();
  });

  test('swallows a synchronously throwing callback', () => {
    const report = createSafeProgressCallback(() => {
      throw new Error('boom');
    });
    expect(() => report('Packing...')).not.toThrow();
  });

  test('swallows a rejecting callback', async () => {
    const report = createSafeProgressCallback(() => Promise.reject(new Error('boom')));
    expect(() => report('Packing...')).not.toThrow();
    // Let the rejection settle; an unhandled rejection would fail the test run.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
