import { z } from 'zod';
import { AppError } from './errorHandler.js';

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      // Preserve the original ZodError via `cause` so downstream log classifiers
      // (packEventSchema.classifyRejectReason) can still read `.issues`.
      throw new AppError(`Invalid request: ${messages}`, 400, { cause: error });
    }
    throw error;
  }
}
