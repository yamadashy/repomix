// Minimal WebAssembly type declarations for Node.js environments
// The full WebAssembly API is available at runtime but not included in TypeScript's "es2022" lib

declare namespace WebAssembly {
  class Module {
    constructor(bytes: BufferSource);
  }

  class Instance {
    constructor(module: Module, importObject?: Imports);
    readonly exports: Exports;
  }

  type Imports = Record<string, Record<string, unknown>>;
  type Exports = Record<string, unknown>;
}
