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
          // Top-level issues (e.g. the MISSING_INPUT / BOTH_PROVIDED checks)
          // have no path — skip the prefix so the message doesn't start with
          // a stray `": "`.
          const path = v.getDotPath(issue) ?? '';
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join(', ');
      // Preserve the original ValiError via `cause` so downstream log classifiers
      // (packEventSchema.classifyRejectReason) can still read `.issues`.
      throw new AppError(`Invalid request: ${messages}`, 400, { cause: error });
    }
    throw error;
  }
}
