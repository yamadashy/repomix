import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logInfo } from './logger.js';

const DAILY_LIMIT = 10;

const createDailyRateLimiter = (): Ratelimit | null => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logInfo('Upstash credentials not found, daily rate limiting disabled');
    return null;
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(DAILY_LIMIT, '1 d'),
    prefix: 'repomix:daily',
  });
};

export const dailyRateLimiter = createDailyRateLimiter();
