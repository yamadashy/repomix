import { RequestCache } from './cache.js';
import { RateLimiter } from './rateLimit.js';
import type { PackResult } from '../types.js';

// Create shared instances
export const cache = new RequestCache<PackResult>(180); // 3 minutes cache
export const rateLimiter = new RateLimiter(60_000, 3); // 3 requests per minute