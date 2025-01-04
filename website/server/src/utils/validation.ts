import { z } from 'zod';
import { AppError } from './errorHandler.js';

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new AppError(`Invalid request: ${messages}`, 400);
    }
    throw error;
  }
}

export function sanitizeIgnorePattern(patterns: string | undefined): string {
  if (!patterns) return '';

  return (
    patterns
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      // Additional security checks
      .filter((p) => {
        // Prevent absolute paths
        if (p.startsWith('/')) return false;
        // Prevent directory traversal
        if (p.includes('../') || p.includes('..\\')) return false;
        // Prevent environment variable expansion
        if (p.includes('$')) return false;
        // Prevent command execution
        if (p.includes('`') || p.includes('$(')) return false;
        return true;
      })
      .join(',')
  );
}
