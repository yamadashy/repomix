import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowedOrigins = ['http://localhost:5173', 'https://repomix.com', 'https://api.repomix.com'];

    if (!origin || allowedOrigins.includes(origin)) {
      return origin;
    }

    if (origin.endsWith('.repomix.pages.dev')) {
      return origin;
    }

    return null;
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Turnstile-Token'],
  maxAge: 86400,
  credentials: true,
});
