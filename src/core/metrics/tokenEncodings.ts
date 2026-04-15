// Supported token encoding types (OpenAI encoding names).
// Extracted into a standalone module so that configSchema.ts can reference them
// without pulling in gpt-tokenizer (which lives in TokenCounter.ts).
export const TOKEN_ENCODINGS = ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'] as const;
export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];
