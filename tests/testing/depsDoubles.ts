import { type Mock, vi } from 'vitest';

// Same shape as Vitest's internal `Procedure`, which `Mock<T>` is constrained to.
// biome-ignore lint/suspicious/noExplicitAny: mirrors Vitest's own constraint so any function type fits
type Procedure = (...args: any[]) => any;

/**
 * A `deps` object whose functions are Vitest mocks that still satisfy the real dependency types.
 * Tests configure and assert on `deps.x` directly (no `vi.mocked` re-cast), and a change to a
 * production dependency's name or signature surfaces as a type error in the test.
 *
 * Unlike Vitest's `Mocked<T>`, each mock is intersected with the real function type: `Mock<T>`
 * keeps only the last overload of functions such as `fs.readFile`, which would otherwise make the
 * double unassignable to the production `deps` parameter.
 */
export type MockedDeps<T> = { [K in keyof T]: T[K] extends Procedure ? Mock<T[K]> & T[K] : T[K] };

/**
 * A mock for an overloaded function such as `fs.readFile` or `fs.stat`, typed for `MockedDeps`.
 * A plain `vi.fn()` cannot satisfy every overload, so the one unavoidable cast lives here.
 */
export const mockOverloaded = <F extends Procedure>(): Mock<F> & F => vi.fn<F>() as unknown as Mock<F> & F;
