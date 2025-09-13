/**
 * Express Application Factory
 * Creates and configures the Express application
 */

import express, { Express } from 'express';
import cors from 'cors';
// ...existing code...
import { compareHandler } from './api/compare-handler';
import geminiDialogueRouter from './api/gemini-dialogue';
import { errorHandler } from './middleware/error-handler';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
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

  // Gemini Dialogue API
  app.use('/api', geminiDialogueRouter);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
