// @valibot/to-json-schema quirks:
// - Does not emit `additionalProperties: false` for `v.object`, even though
//   Valibot strips unknown keys at runtime. We add it so editors flag typos.
// - Emits an empty `required: []` on every object node, which is valid but noisy.
//   We strip empty arrays to match the previous zod-generated output.
// Mutates the tree in place — the caller passes the root schema and discards
// the return value.
export const normalizeObjectNode = (node: unknown): void => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) normalizeObjectNode(item);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type === 'object' && obj.properties && typeof obj.properties === 'object') {
    if (!('additionalProperties' in obj)) {
      obj.additionalProperties = false;
    }
    if (Array.isArray(obj.required) && obj.required.length === 0) {
      delete obj.required;
    }
  }
  for (const value of Object.values(obj)) normalizeObjectNode(value);
};
