import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: ContentfulStatusCode = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handlePackError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const errorMessage = error.message || '';

    if (errorMessage.includes('Repository not found')) {
      return new AppError('Repository not found', 404);
    }

    if (errorMessage.includes('Failed to clone repository')) {
      return new AppError('Failed to clone repository', 422);
    }

    if (errorMessage.includes('circular') || errorMessage.includes('Converting circular structure to JSON')) {
      return new AppError(
        'Failed to process repository: circular dependency detected in the repository structure',
        422,
      );
    }

    return new AppError(process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message);
  }

  return new AppError('An unexpected error occurred');
}

export function safeJSONStringify(obj: unknown): string {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular Reference]';
      }
      cache.add(value);
    }
    return value;
  });
}
