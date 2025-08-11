import { describe, expect, it } from 'vitest';
import type { createWorkerPool, initTaskRunner } from '../../src/shared/processConcurrency.js';

describe('Worker Runtime Configuration', () => {
  it('should have proper TypeScript types for runtime', () => {
    // This test validates that TypeScript compilation succeeds with the new parameter
    // We're only testing types here, not runtime behavior
    const runtime1: Parameters<typeof createWorkerPool>[2] = 'worker_threads';
    const runtime2: Parameters<typeof createWorkerPool>[2] = 'child_process';
    const runtime3: Parameters<typeof initTaskRunner>[2] = 'worker_threads';
    const runtime4: Parameters<typeof initTaskRunner>[2] = 'child_process';

    expect(runtime1).toBe('worker_threads');
    expect(runtime2).toBe('child_process');
    expect(runtime3).toBe('worker_threads');
    expect(runtime4).toBe('child_process');
  });
});
