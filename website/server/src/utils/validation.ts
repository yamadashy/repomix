import * as v from 'valibot';
import { AppError } from './errorHandler.js';

export function validateRequest<TSchema extends v.GenericSchema>(
  schema: TSchema,
  data: unknown,
): v.InferOutput<TSchema> {
  try {
    return v.parse(schema, data);
  } catch (error) {
    if (error instanceof v.ValiError) {
      const messages = error.issues
        .map((issue) => {
          const path = Array.isArray(issue.path)
            ? issue.path
                .map((segment: { key?: unknown }) =>
                  segment && typeof segment === 'object' && 'key' in segment ? String(segment.key) : '',
                )
                .filter((segment: string) => segment !== '')
                .join('.')
            : '';
          return `${path}: ${issue.message}`;
        })
        .join(', ');
      // Preserve the original ValiError via `cause` so downstream log classifiers
      // (packEventSchema.classifyRejectReason) can still read `.issues`.
      throw new AppError(`Invalid request: ${messages}`, 400, { cause: error });
    }
    throw error;
  }
}
