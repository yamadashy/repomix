import type { PackResult } from '../../../types.js';
import { RateLimiter } from '../../../utils/rateLimit.js';
import { RequestCache } from './cache.js';

// Create shared instances
export const cache = new RequestCache<PackResult>(600); // 10 minutes cache
export const rateLimiter = new RateLimiter(60_000, process.env.NODE_ENV === 'development' ? 10 : 3); // 10 requests per minute in dev, 3 in production
