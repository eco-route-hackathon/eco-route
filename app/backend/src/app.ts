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

  // Middleware
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Main API endpoint
  app.post('/compare', compareHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}