import { RepomixError } from './errorHandle.js';

const SIZE_RE = /^\s*(\d+)\s*(kb|mb)\s*$/i;

export const parseHumanSizeToBytes = (input: string): number => {
  const match = SIZE_RE.exec(input);
  if (!match) {
    throw new RepomixError(`Invalid size: '${input}'. Expected format like '500kb' or '2mb' (case-insensitive).`);
  }

  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RepomixError(`Invalid size amount: '${match[1]}'. Must be a positive integer.`);
  }

  const unit = match[2].toLowerCase();
  const multiplier = unit === 'kb' ? 1024 : 1024 * 1024;
  const bytes = amount * multiplier;

  if (!Number.isSafeInteger(bytes)) {
    throw new RepomixError(`Invalid size: '${input}'. Resulting byte value is too large.`);
  }

  return bytes;
};
