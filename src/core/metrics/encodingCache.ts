import { BytePairEncodingCore } from 'gpt-tokenizer/BytePairEncodingCore';
import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncoding } from 'gpt-tokenizer/resolveEncoding';
import { logger } from '../../shared/logger.js';
import type { TokenEncoding } from './tokenEncoding.js';

/**
 * Serializable encoding data that can be passed to workers via structured clone.
 * Pre-building in the main thread avoids each worker spending ~60-90ms
 * constructing the BPE encoder Map from 200K entries.
 */
export interface EncodingData {
  bytePairRankDecoder: unknown;
  bytePairStringRankEncoder: Map<string, number>;
  bytePairNonUtfRankDecoder: Map<number, Uint8Array>;
  bytePairNonUtfSortedEncoder: [Uint8Array, number][];
  mergeableBytePairRankCount: number;
  tokenSplitRegex: RegExp;
  specialTokensEncoder: Map<string, number>;
  specialTokensDecoder: Map<number, string>;
  specialTokenPatternSource: string;
}

const encodingDataCache = new Map<TokenEncoding, EncodingData>();

/**
 * Pre-build encoding data in the main thread.
 * This builds the BPE encoder once and caches the result for sharing with workers.
 */
export const preBuildEncodingData = (encodingName: TokenEncoding): EncodingData => {
  let data = encodingDataCache.get(encodingName);
  if (data) {
    return data;
  }

  const startTime = process.hrtime.bigint();

  const enc = GptEncoding.getEncodingApi(encodingName, resolveEncoding);
  // Access internal properties via type assertion for pre-building worker data
  const core = (enc as unknown as Record<string, unknown>).bytePairEncodingCoreProcessor as Record<string, unknown>;

  data = {
    bytePairRankDecoder: core.bytePairRankDecoder,
    bytePairStringRankEncoder: core.bytePairStringRankEncoder as Map<string, number>,
    bytePairNonUtfRankDecoder: core.bytePairNonUtfRankDecoder as Map<number, Uint8Array>,
    bytePairNonUtfSortedEncoder: core.bytePairNonUtfSortedEncoder as [Uint8Array, number][],
    mergeableBytePairRankCount: core.mergeableBytePairRankCount as number,
    tokenSplitRegex: core.tokenSplitRegex as RegExp,
    specialTokensEncoder: core.specialTokensEncoder as Map<string, number>,
    specialTokensDecoder: core.specialTokensDecoder as Map<number, string>,
    specialTokenPatternSource: (core.specialTokenPatternRegex as RegExp).source,
  };

  encodingDataCache.set(encodingName, data);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`Pre-built encoding data for ${encodingName} in ${initTime.toFixed(2)}ms`);

  return data;
};

/**
 * Reconstruct a GptEncoding instance from pre-built data.
 * This bypasses the expensive BPE encoder Map construction (~60-90ms)
 * by directly assigning the pre-built data structures.
 */
export const restoreEncodingFromData = (data: EncodingData): GptEncoding => {
  // Bypass the constructor which runs the expensive Map building loop
  const core = Object.create(BytePairEncodingCore.prototype) as Record<string, unknown>;
  core.textEncoder = new TextEncoder();
  core.mergeCacheSize = 100_000;
  core.mergeCache = new Map<string, number[]>();
  core.bytePairRankDecoder = data.bytePairRankDecoder;
  core.bytePairStringRankEncoder = data.bytePairStringRankEncoder;
  core.bytePairNonUtfRankDecoder = data.bytePairNonUtfRankDecoder;
  core.bytePairNonUtfSortedEncoder = data.bytePairNonUtfSortedEncoder;
  core.mergeableBytePairRankCount = data.mergeableBytePairRankCount;
  core.tokenSplitRegex = data.tokenSplitRegex;
  core.specialTokensEncoder = data.specialTokensEncoder;
  core.specialTokensDecoder = data.specialTokensDecoder;
  core.specialTokenPatternRegex = new RegExp(data.specialTokenPatternSource, 'y');

  const enc = Object.create(GptEncoding.prototype) as Record<string, unknown>;
  enc.bytePairEncodingCoreProcessor = core;
  enc.specialTokensEncoder = data.specialTokensEncoder;
  enc.specialTokensSet = new Set(data.specialTokensEncoder.keys());
  enc.defaultSpecialTokenConfig = {};

  return enc as unknown as GptEncoding;
};
