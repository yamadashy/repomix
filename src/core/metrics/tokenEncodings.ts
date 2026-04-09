// Supported token encoding types (OpenAI encoding names).
// Extracted from TokenCounter.ts to avoid pulling gpt-tokenizer into the
// config schema import graph (configSchema.ts only needs the encoding names
// for Zod validation, not the heavy tokenizer library).
export const TOKEN_ENCODINGS = ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'] as const;
export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];
