/**
 * Minimal WebAssembly type declarations.
 *
 * The project targets es2022 which does not include WebAssembly types.
 * These declarations cover only the subset used by the tiktoken WASM module sharing.
 */

declare namespace WebAssembly {
  class Module {
    constructor(bytes: BufferSource);
  }

  class Instance {
    readonly exports: Record<string, unknown>;
    constructor(module: Module, importObject?: Imports);
  }

  interface WebAssemblyInstantiatedSource {
    instance: Instance;
    module: Module;
  }

  // biome-ignore lint/complexity/noBannedTypes: WebAssembly spec defines ImportValue as accepting any function
  type ImportValue = Function | Global | Memory | Table | number;
  type Imports = Record<string, Record<string, ImportValue>>;

  class Global {
    constructor(descriptor: GlobalDescriptor, value?: number);
    value: number;
  }

  interface GlobalDescriptor {
    mutable?: boolean;
    value: string;
  }

  class Memory {
    constructor(descriptor: MemoryDescriptor);
    readonly buffer: ArrayBuffer;
  }

  interface MemoryDescriptor {
    initial: number;
    maximum?: number;
    shared?: boolean;
  }

  class Table {
    constructor(descriptor: TableDescriptor);
    readonly length: number;
  }

  interface TableDescriptor {
    element: string;
    initial: number;
    maximum?: number;
  }

  function compile(bytes: BufferSource): Promise<Module>;
  function instantiate(moduleObject: Module, importObject?: Imports): Promise<Instance>;
  function instantiate(bytes: BufferSource, importObject?: Imports): Promise<WebAssemblyInstantiatedSource>;
}
