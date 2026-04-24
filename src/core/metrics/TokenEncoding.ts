// Token encoding names are declared separately from TokenCounter so that
// consumers who only need the encoding list (e.g. configSchema validation)
// can import them without pulling in the gpt-tokenizer module graph.
// TokenCounter re-exports these values for backward compatibility.

// Supported token encoding types (OpenAI encoding names)
export const TOKEN_ENCODINGS = ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'] as const;
export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];
