import { describe, it, expect, vi } from 'vitest';
import { XmlParseStrategy } from '../../../../src/core/treeSitter/parseStrategies/XmlParseStrategy.js';

// Mock SyntaxNode structure
class MockSyntaxNode {
  readonly id: string;
  readonly type: string;
  readonly text: string;
  readonly startPosition: { row: number; column: number };
  readonly endPosition: { row: number; column: number };
  readonly parent: MockSyntaxNode | null;
  readonly children: MockSyntaxNode[];

  constructor(
    id: string,
    type: string,
    text: string,
    parent: MockSyntaxNode | null = null,
    startRow = 0,
    startColumn = 0,
    endRow = 0,
    endColumn = 0,
    children: MockSyntaxNode[] = []
  ) {
    this.id = id;
    this.type = type;
    this.text = text;
    this.parent = parent;
    this.startPosition = { row: startRow, column: startColumn };
    this.endPosition = { row: endRow, column: endColumn };
    this.children = children;
  }

  childForFieldName(name: string): MockSyntaxNode | null {
    if (name === 'name' && this.children.length > 0) {
      return this.children.find(child => child.type === 'name') || null;
    }
    return null;
  }
}

describe('XmlParseStrategy', () => {
  const strategy = new XmlParseStrategy();

  // Helper to simulate parsing a tag
  function mockCapture(tagName: string, depth: number = 0): { capture: any; expected: string } {
    let parent: MockSyntaxNode | null = null;

    // Create parent chain to simulate depth
    for (let i = 0; i < depth; i++) {
      parent = new MockSyntaxNode(`parent-${i}`, 'element', '', parent);
    }

    // Create name node
    const nameNode = new MockSyntaxNode('name-node', 'name', tagName);

    // Create the actual node
    const node = new MockSyntaxNode(
      `node-${tagName}`,
      'start_tag',
      `<${tagName}>`,
      parent,
      0, 0, 0, tagName.length + 2,
      [nameNode]
    );

    // Calculate expected indentation
    const indent = depth > 0 ? '  '.repeat(depth) : '';
    const expected = `${indent}<${tagName}`;

    return {
      capture: { node, name: 'start_tag' },
      expected
    };
  }

  it('should extract the tag name with proper indentation', () => {
    const tests = [
      mockCapture('root'),
      mockCapture('element', 1),
      mockCapture('child', 2),
      mockCapture('grandchild', 3)
    ];

    const processedChunks = new Set<string>();
    const lines: string[] = [];
    const context = {} as any;

    for (const test of tests) {
      const result = strategy.parseCapture(test.capture, lines, processedChunks, context);
      expect(result).toEqual(test.expected);
    }
  });

  it('should handle multiple tags at the same depth level', () => {
    const tests = [
      mockCapture('first', 1),
      mockCapture('second', 1),
      mockCapture('third', 1)
    ];

    const processedChunks = new Set<string>();
    const lines: string[] = [];
    const context = {} as any;

    for (const test of tests) {
      const result = strategy.parseCapture(test.capture, lines, processedChunks, context);
      expect(result).toEqual(test.expected);
    }
  });

  it('should handle self-closing tags', () => {
    const nameNode = new MockSyntaxNode('name-node', 'name', 'img');
    const node = new MockSyntaxNode(
      'node-img',
      'self_closing_tag',
      '<img />',
      null,
      0, 0, 0, 7,
      [nameNode]
    );

    const processedChunks = new Set<string>();
    const lines: string[] = [];
    const context = {} as any;

    const result = strategy.parseCapture({ node, name: 'self_closing_tag' }, lines, processedChunks, context);
    expect(result).toEqual('<img');
  });

  it('should ignore non-start-tag and non-self-closing-tag nodes', () => {
    const nameNode = new MockSyntaxNode('name-node', 'name', 'text');
    const node = new MockSyntaxNode(
      'node-text',
      'text',
      'Some text',
      null,
      0, 0, 0, 9,
      [nameNode]
    );

    const processedChunks = new Set<string>();
    const lines: string[] = [];
    const context = {} as any;

    const result = strategy.parseCapture({ node, name: 'text' }, lines, processedChunks, context);
    expect(result).toBeNull();
  });

  it('should avoid duplicate captures', () => {
    const { capture, expected } = mockCapture('duplicate');

    const processedChunks = new Set<string>();
    const lines: string[] = [];
    const context = {} as any;

    // First capture should work
    const result1 = strategy.parseCapture(capture, lines, processedChunks, context);
    expect(result1).toEqual(expected);

    // Second identical capture should be ignored
    const result2 = strategy.parseCapture(capture, lines, processedChunks, context);
    expect(result2).toBeNull();
  });
});
