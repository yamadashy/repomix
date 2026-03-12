import { RepomixError } from './errorHandle.js';

const SIZE_RE = /^\s*(\d+(?:\.\d+)?)\s*(kb|mb)\s*$/i;

export const parseHumanSizeToBytes = (input: string): number => {
  const match = SIZE_RE.exec(input);
  if (!match) {
    throw new RepomixError(
      `Invalid size: '${input}'. Expected format like '500kb', '2mb', or '2.5mb' (case-insensitive).`,
    );
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RepomixError(`Invalid size amount: '${match[1]}'. Must be a positive number.`);
  }

  const unit = match[2].toLowerCase();
  const multiplier = unit === 'kb' ? 1024 : 1024 * 1024;
  const bytes = Math.floor(amount * multiplier);

  if (!Number.isSafeInteger(bytes)) {
    throw new RepomixError(`Invalid size: '${input}'. Resulting byte value is too large.`);
  }

  return bytes;
};
