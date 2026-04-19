// Supported token encoding types (OpenAI encoding names). Kept in its own
// module so configSchema's startup import does not drag in gpt-tokenizer.
export const TOKEN_ENCODINGS = ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'] as const;
export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];
