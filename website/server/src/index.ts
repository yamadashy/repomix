import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { timeout } from 'hono/timeout';
import { processRemoteRepo } from './remoteRepo.js';
import type { ErrorResponse } from './types.js';
import { handlePackError } from './utils/errorHandler.js';

const app = new Hono();

// Set up CORS
app.use(
  '/*',
  cors({
    origin: ['http://localhost:5173', 'https://repomix.com', 'https://api.repomix.com'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
    credentials: true,
  }),
);

// Enable compression for all routes
app.use(compress());

// Set up timeout middleware for /api routes
app.use('/api', timeout(30000));

// GET /health
app.get('/health', (c) => c.text('OK'));

// POST /api/pack
app.post(
  '/api/pack',
  bodyLimit({
    maxSize: 50 * 1024, // 50kb
    onError: (c) => {
      return c.text('overflow :(', 413);
    },
  }),
  async (c) => {
    try {
      const body = await c.req.json();
      const { url, format, options } = body;

      if (!url) {
        return c.json({ error: 'Repository URL is required' } as ErrorResponse, 400);
      }

      if (!['xml', 'markdown', 'plain'].includes(format)) {
        return c.json({ error: 'Invalid format specified' } as ErrorResponse, 400);
      }

      // Get client IP address
      const clientIp =
        c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.req.header('cf-connecting-ip') || '0.0.0.0';

      const result = await processRemoteRepo(url, format, options, clientIp);
      return c.json(result);
    } catch (error) {
      console.error('Error processing request:', error);
      const appError = handlePackError(error);
      return c.json(
        {
          error: appError.message,
        } as ErrorResponse,
        appError.statusCode,
      );
    }
  },
);

// Start the server
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
console.log(`Server is starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

// Export the app for testing
export default app;
