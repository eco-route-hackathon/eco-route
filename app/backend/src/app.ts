/**
 * Express Application Factory
 * Creates and configures the Express application
 */

import express, { Express } from 'express';
import cors from 'cors';
import { compareHandler } from './api/compare-handler';
import { errorHandler } from './middleware/error-handler';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // CORS: 本番(Amplify)とローカルの両方を許可
  const whitelist = new Set([
    'https://main.d3qpohfoijpvg.amplifyapp.com', // 本番
    'http://localhost:5173', // 開発
  ]);
  const corsOptions = {
    origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
      if (!origin) return cb(null, true); // curl等Origin無しも許可
      if (whitelist.has(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  // 明示的に全パスのOPTIONSを許可（プリフライト対策）
  app.options('*', cors(corsOptions));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Main API endpoint
  app.post('/compare', compareHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
