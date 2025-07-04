import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Edit, Language, Point, Query, Range, SyntaxNode, Tree, TreeCursor } from 'web-tree-sitter';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { TypeScriptParseStrategy } from '../../../src/core/treeSitter/parseStrategies/TypeScriptParseStrategy.js';
import { createMockConfig } from '../../../tests/testing/testUtils.js';

interface MockContext {
  fileContent: string;
  lines: string[];
  tree: Tree;
  query: Query;
  config: RepomixConfigMerged;
}

describe('TypeScript File Parsing', () => {
  describe('parseFile for TypeScript', () => {
    test('should parse TypeScript correctly', async () => {
      const fileContent = `
        // TypeScript function
        /**
         * Says hello to the given name
         * @param name The name to greet
         */
        function sayHello(name) { console.log("Hello, " + name); }
      `;
      const filePath = 'dummy.ts';
      const config = {};
      const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);
      expect(typeof result).toBe('string');

      const expectContents = [
        'sayHello',
        'TypeScript function',
        'Says hello to the given name',
        '@param name The name to greet',
      ];

      for (const expectContent of expectContents) {
        expect(result).toContain(expectContent);
      }
    });

    test('should parse TypeScript arrow functions correctly', async () => {
      const fileContent = `
          // Arrow function for addition
          /** Adds two numbers together
           * @param x First number
           * @param y Second number
           */
          const add = (x: number, y: number): number => {
              return x + y;
          };
          // Function type declaration
          let multiply: (a: number, b:number) => number;
          multiply = (a, b) => {
              return a*b;
          }
      `;
      const filePath = 'dummy.ts';
      const config = { output: { compress: true } };
      const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);

      expect(typeof result).toBe('string');

      const expectContents = [
        'add',
        'multiply',
        'Arrow function for addition',
        'Adds two numbers together',
        '@param x First number',
        '@param y Second number',
        'Function type declaration',
      ];

      for (const expectContent of expectContents) {
        expect(result).toContain(expectContent);
      }
    });

    test('should parse TSX correctly', async () => {
      const fileContent = `
        // Greeting component
        /**
         * A simple greeting component
         * @param name Person to greet
         */
        function greet(name: string){ console.log("Hello, " + name); }
      `;
      const filePath = 'dummy.tsx';
      const config = {};
      const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);
      expect(typeof result).toBe('string');

      const expectContents = [
        'greet',
        'Greeting component',
        'A simple greeting component',
        '@param name Person to greet',
      ];

      for (const expectContent of expectContents) {
        expect(result).toContain(expectContent);
      }
    });
  });

  describe('TypeScript Parse Strategy', () => {
    let strategy: TypeScriptParseStrategy;
    let processedChunks: Set<string>;
    let mockContext: MockContext;

    // Helper function to create a mock capture object
    const createMockCapture = (name: string, startRow: number, endRow: number): { node: SyntaxNode; name: string } => {
      return {
        node: {
          startPosition: { row: startRow } as Point,
          endPosition: { row: endRow } as Point,
        } as SyntaxNode,
        name,
      };
    };

    beforeEach(() => {
      strategy = new TypeScriptParseStrategy();
      processedChunks = new Set<string>();

      const mockCursor: TreeCursor = {
        nodeType: '',
        nodeTypeId: 0,
        nodeStateId: 0,
        nodeText: '',
        nodeIsNamed: false,
        nodeIsMissing: false,
        startPosition: { row: 0, column: 0 } as Point,
        endPosition: { row: 0, column: 0 } as Point,
        startIndex: 0,
        endIndex: 0,
        nodeId: 0,
        currentNode: {} as SyntaxNode,
        currentDepth: 0,
        currentDescendantIndex: 0,
        currentFieldId: 0,
        currentFieldName: '',
        gotoFirstChild(): boolean {
          return false;
        },
        gotoLastChild(): boolean {
          return false;
        },
        gotoNextSibling(): boolean {
          return false;
        },
        gotoPreviousSibling(): boolean {
          return false;
        },
        gotoParent(): boolean {
          return false;
        },
        gotoFirstChildForIndex(index: number): boolean {
          return false;
        },
        gotoFirstChildForPosition(goalPosition: Point): boolean {
          return false;
        },
        gotoDescendant(goalDescendantIndex: number): boolean {
          return false;
        },
        reset(): void {},
        resetTo(cursor: TreeCursor): void {},
        delete(): void {},
      };

      const mockTree: Tree = {
        rootNode: {} as SyntaxNode,
        rootNodeWithOffset(offsetBytes: number, offsetExtent: Point): SyntaxNode {
          return {} as SyntaxNode;
        },
        getChangedRanges(other: Tree): Range[] {
          return [];
        },
        getIncludedRanges(): Range[] {
          return [];
        },
        copy(): Tree {
          return this;
        },
        delete() {},
        edit(delta: Edit) {},
        getLanguage(): Language {
          return {} as Language;
        },
        walk(): TreeCursor {
          return mockCursor;
        },
      };

      mockContext = {
        fileContent: '',
        lines: [],
        tree: mockTree,
        query: {} as Query,
        config: {} as RepomixConfigMerged,
      };
    });

    describe('Type declarations', () => {
      test('should correctly parse class declarations with extends', () => {
        const lines = ['class ChildClass extends ParentClass {', '  constructor() { super(); }', '}'];
        const capture = createMockCapture('definition.class', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('class ChildClass extends ParentClass');
      });

      test('should correctly parse class declarations with implements', () => {
        const lines = [
          'class MyService implements IService {',
          '  getData(): Promise<Data> { return Promise.resolve({}); }',
          '}',
        ];
        const capture = createMockCapture('definition.class', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('class MyService implements IService');
      });

      test('should correctly parse interface declarations', () => {
        const lines = [
          'interface IRepository<T> {',
          '  findById(id: string): Promise<T>;',
          '  save(entity: T): Promise<void>;',
          '}',
        ];
        const capture = createMockCapture('definition.interface', 0, 3);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe(
          [
            'interface IRepository<T> {',
            '  findById(id: string): Promise<T>;',
            '  save(entity: T): Promise<void>;',
            '}',
          ].join('\n'),
        );
      });

      test('should correctly parse type aliases', () => {
        const lines = ['type RequestHandler = (req: Request, res: Response) => Promise<void>;'];
        const capture = createMockCapture('definition.type', 0, 0);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('type RequestHandler = (req: Request, res: Response) => Promise<void>;');
      });

      test('should correctly parse enum declarations', () => {
        const lines = [
          'enum Direction {',
          '  Up = "UP",',
          '  Down = "DOWN",',
          '  Left = "LEFT",',
          '  Right = "RIGHT"',
          '}',
        ];
        const capture = createMockCapture('definition.enum', 0, 5);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe(
          ['enum Direction {', '  Up = "UP",', '  Down = "DOWN",', '  Left = "LEFT",', '  Right = "RIGHT"', '}'].join(
            '\n',
          ),
        );
      });
    });

    describe('Import declarations', () => {
      test('should correctly parse named imports', () => {
        const lines = ['import { useState, useEffect } from "react";'];
        const capture = createMockCapture('definition.import', 0, 0);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('import { useState, useEffect } from "react";');
      });

      test('should correctly parse default imports', () => {
        const lines = ['import React from "react";'];
        const capture = createMockCapture('definition.import', 0, 0);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('import React from "react";');
      });
    });

    describe('Property declarations', () => {
      test('should correctly parse class properties', () => {
        const lines = ['class Example {', '  private readonly name: string;', '  public age: number = 0;', '}'];
        const capture = createMockCapture('definition.property', 1, 1);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBeNull();
      });

      test('should correctly parse interface properties', () => {
        const lines = ['interface Config {', '  readonly apiKey: string;', '  timeout?: number;', '}'];
        const capture = createMockCapture('definition.property', 1, 1);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBeNull();
      });
    });

    describe('Duplicate detection for type definitions', () => {
      test('should detect duplicate class definitions', () => {
        const lines = ['class Example {', '  constructor() {}', '}'];
        const capture1 = createMockCapture('definition.class', 0, 2);
        const capture2 = createMockCapture('definition.class', 0, 2);

        const result1 = strategy.parseCapture(capture1, lines, processedChunks, mockContext);
        expect(result1).toBe('class Example');

        const result2 = strategy.parseCapture(capture2, lines, processedChunks, mockContext);
        expect(result2).toBeNull();
      });
    });

    describe('Function declarations', () => {
      test('should correctly parse standard function declarations', () => {
        const lines = [
          'function myFunction(param1: string, param2: number): void {',
          '  console.log(param1, param2);',
          '}',
        ];
        const capture = createMockCapture('name.definition.function', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('function myFunction(param1: string, param2: number): void');
        expect(processedChunks.size).toBe(1);
      });

      test('should correctly parse exported function declarations', () => {
        const lines = [
          'export function exportedFunction(param: string): string {',
          '  return param.toUpperCase();',
          '}',
        ];
        const capture = createMockCapture('name.definition.function', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('export function exportedFunction(param: string): string');
        expect(processedChunks.size).toBe(1);
      });
    });

    describe('Arrow functions', () => {
      test('should correctly parse arrow function expressions', () => {
        const lines = ['const arrowFunc = (a: number, b: number): number => {', '  return a + b;', '};'];
        const capture = createMockCapture('name.definition.function', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('const arrowFunc = (a: number, b: number): number =>');
        expect(processedChunks.has('func:arrowFunc')).toBe(true);
      });

      test('should correctly parse exported arrow function expressions', () => {
        const lines = ['export const exportedArrow = (text: string): string => {', '  return text.trim();', '};'];
        const capture = createMockCapture('name.definition.function', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('export const exportedArrow = (text: string): string =>');
        expect(processedChunks.has('func:exportedArrow')).toBe(true);
      });

      test('should correctly parse one-line arrow functions', () => {
        const lines = ['const shortArrow = (x: number): number => x * 2;'];
        const capture = createMockCapture('name.definition.function', 0, 0);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('const shortArrow = (x: number): number');
        expect(processedChunks.has('func:shortArrow')).toBe(true);
      });

      test('should correctly parse async arrow functions', () => {
        const lines = [
          'const asyncArrow = async (url: string): Promise<Response> => {',
          '  return await fetch(url);',
          '};',
        ];
        const capture = createMockCapture('name.definition.function', 0, 2);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('const asyncArrow = async (url: string): Promise<Response> =>');
        expect(processedChunks.has('func:asyncArrow')).toBe(true);
      });
    });

    describe('Method declarations', () => {
      test('should correctly parse class method declarations', () => {
        const lines = ['class MyClass {', '  myMethod(param: string): void {', '    console.log(param);', '  }', '}'];
        const capture = createMockCapture('name.definition.method', 1, 3);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('myMethod(param: string): void');
      });

      test('should correctly parse interface method signatures', () => {
        const lines = ['interface MyInterface {', '  methodSignature(param: number): boolean;', '}'];
        const capture = createMockCapture('name.definition.method', 1, 1);

        const result = strategy.parseCapture(capture, lines, processedChunks, mockContext);

        expect(result).toBe('methodSignature(param: number): boolean;');
      });
    });

    describe('Function name extraction', () => {
      test('should extract function name from standard declaration', () => {
        const lines = ['const myFunc = (a: number) => a * 2;'];

        // Using private method directly through type casting to test name extraction
        const functionName = (
          strategy as unknown as { getFunctionName(lines: string[], index: number): string }
        ).getFunctionName(lines, 0);

        expect(functionName).toBe('myFunc');
      });

      test('should extract function name from exported declaration', () => {
        const lines = ['export const exportedFunc = (a: number) => a * 2;'];

        const functionName = (
          strategy as unknown as { getFunctionName(lines: string[], index: number): string }
        ).getFunctionName(lines, 0);

        expect(functionName).toBe('exportedFunc');
      });

      test('should handle variable declarations without function assignment', () => {
        const lines = ['const justVariable = 42;'];

        const functionName = (
          strategy as unknown as { getFunctionName(lines: string[], index: number): string }
        ).getFunctionName(lines, 0);

        expect(functionName).toBe('justVariable');
      });
    });
  });
});
