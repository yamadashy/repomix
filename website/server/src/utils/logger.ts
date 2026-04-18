import winston from 'winston';
import type { ClientInfo } from './clientInfo.js';
import { formatMemoryUsage, getMemoryUsage } from './memory.js';

// Map winston levels to Cloud Logging severity levels
// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
const cloudLoggingSeverity = winston.format((info) => {
  const severityMap: Record<string, string> = {
    error: 'ERROR',
    warn: 'WARNING',
    info: 'INFO',
    debug: 'DEBUG',
  };
  info.severity = severityMap[info.level] || 'DEFAULT';
  return info;
});

// Configure transports based on environment
function createLogger() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Use Console transport for both environments
  // Cloud Run automatically sends stdout to Cloud Logging
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(cloudLoggingSeverity(), winston.format.json())
        : winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ];

  return winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    transports,
  });
}

// Create and export the logger instance
export const logger = createLogger();

// Utility logging functions
export function logDebug(message: string, context?: Record<string, unknown>): void {
  logger.debug({
    message,
    ...context,
  });
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  logger.info({
    message,
    ...context,
  });
}

export function logWarning(message: string, context?: Record<string, unknown>): void {
  logger.warn({
    message,
    ...context,
  });
}

export function logError(message: string, error?: Error, context?: Record<string, unknown>): void {
  logger.error({
    message,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
        }
      : undefined,
    ...context,
  });
}

/**
 * Build a `cf` log field from Cloudflare-injected headers. Returns `undefined`
 * when none are present so direct-to-origin requests don't emit empty `cf: {}`.
 * Shared across middlewares that want to attach Cloudflare context to their
 * logs (cloudLogger request lifecycle, rateLimit 429 events).
 */
export function buildCfLogField(clientInfo: ClientInfo): Record<string, string> | undefined {
  if (!clientInfo.cfRay && !clientInfo.cfCountry && !clientInfo.cfAsn) return undefined;
  const cf: Record<string, string> = {};
  if (clientInfo.cfRay) cf.ray = clientInfo.cfRay;
  if (clientInfo.cfCountry) cf.country = clientInfo.cfCountry;
  if (clientInfo.cfAsn) cf.asn = clientInfo.cfAsn;
  return cf;
}

/**
 * Log current memory usage with optional context
 */
export function logMemoryUsage(message: string, context?: Record<string, unknown>): void {
  const memoryUsage = getMemoryUsage();

  logger.info({
    message: `${message} - Memory: ${formatMemoryUsage(memoryUsage)}`,
    memory: memoryUsage,
    ...context,
  });
}
