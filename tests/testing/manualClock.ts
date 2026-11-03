import type { Timers } from '../../src/shared/timers.js';

interface ScheduledTimer {
  due: number;
  callback: () => void;
}

// Let every queued promise continuation settle before the next step.
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * A virtual clock implementing the injectable Timers: nothing fires until `advance` moves
 * time forward, so debounce and timeout tests run instantly and deterministically.
 */
export const createManualClock = () => {
  let now = 0;
  let nextId = 0;
  const scheduled = new Map<number, ScheduledTimer>();
  const idOf = new WeakMap<object, number>();

  const timers: Timers = {
    setTimeout: (callback, ms) => {
      const id = nextId++;
      scheduled.set(id, { due: now + ms, callback });
      const handle = { unref: () => handle, ref: () => handle, hasRef: () => false };
      idOf.set(handle, id);
      // Callers only pass the handle back to clearTimeout or call unref() on it.
      return handle as unknown as NodeJS.Timeout;
    },
    clearTimeout: (timer) => {
      const id = timer ? idOf.get(timer) : undefined;
      if (id !== undefined) {
        scheduled.delete(id);
      }
    },
  };

  /** Move time forward by `ms`, firing due timers in order and letting their work settle. */
  const advance = async (ms: number): Promise<void> => {
    await settle();
    const target = now + ms;
    for (;;) {
      let nextEntry: [number, ScheduledTimer] | undefined;
      for (const entry of scheduled) {
        if (entry[1].due <= target && (!nextEntry || entry[1].due < nextEntry[1].due)) {
          nextEntry = entry;
        }
      }
      if (!nextEntry) break;
      const [id, timer] = nextEntry;
      scheduled.delete(id);
      now = timer.due;
      timer.callback();
      await settle();
    }
    now = target;
  };

  return {
    timers,
    advance,
    pendingCount: () => scheduled.size,
  };
};
