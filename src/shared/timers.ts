// The timer functions code that waits or debounces receives through its deps, so tests can
// drive time deterministically instead of faking the global clock.
export interface Timers {
  setTimeout: (callback: () => void, ms: number) => NodeJS.Timeout;
  clearTimeout: (timer: NodeJS.Timeout | undefined) => void;
}

export const nodeTimers: Timers = { setTimeout, clearTimeout };
