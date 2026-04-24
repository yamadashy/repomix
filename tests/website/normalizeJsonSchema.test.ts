import { describe, expect, it } from 'vitest';
import { normalizeObjectNode } from '../../website/client/scripts/normalizeJsonSchema.js';

describe('normalizeObjectNode', () => {
  it('adds additionalProperties: false to object nodes with properties', () => {
    const schema = {
      type: 'object',
      properties: { foo: { type: 'string' } },
    };
    normalizeObjectNode(schema);
    expect((schema as Record<string, unknown>).additionalProperties).toBe(false);
  });

  it('strips empty required arrays from object nodes', () => {
    const schema = {
      type: 'object',
      properties: { foo: { type: 'string' } },
      required: [] as string[],
    };
    normalizeObjectNode(schema);
    expect('required' in schema).toBe(false);
  });

  it('preserves non-empty required arrays', () => {
    const schema = {
      type: 'object',
      properties: { foo: { type: 'string' } },
      required: ['foo'],
    };
    normalizeObjectNode(schema);
    expect(schema.required).toEqual(['foo']);
  });

  it('does not override an explicitly-set additionalProperties', () => {
    const schema = {
      type: 'object',
      properties: { foo: { type: 'string' } },
      additionalProperties: true,
    };
    normalizeObjectNode(schema);
    expect(schema.additionalProperties).toBe(true);
  });

  it('recurses into nested properties, anyOf, oneOf, and items', () => {
    const schema = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: { bar: { type: 'number' } },
          required: [] as string[],
        },
        union: {
          anyOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'string' } } },
          ],
        },
        list: {
          type: 'array',
          items: {
            type: 'object',
            properties: { c: { type: 'string' } },
          },
        },
      },
    };
    normalizeObjectNode(schema);

    const nested = schema.properties.nested as Record<string, unknown>;
    expect(nested.additionalProperties).toBe(false);
    expect('required' in nested).toBe(false);

    for (const branch of schema.properties.union.anyOf) {
      expect((branch as Record<string, unknown>).additionalProperties).toBe(false);
    }

    const items = schema.properties.list.items as Record<string, unknown>;
    expect(items.additionalProperties).toBe(false);
  });

  it('skips non-object nodes (primitives, null)', () => {
    expect(() => normalizeObjectNode(null)).not.toThrow();
    expect(() => normalizeObjectNode('string')).not.toThrow();
    expect(() => normalizeObjectNode(42)).not.toThrow();
  });

  it('does not add additionalProperties to object nodes without properties', () => {
    const schema = { type: 'object' };
    normalizeObjectNode(schema);
    expect('additionalProperties' in schema).toBe(false);
  });
});
