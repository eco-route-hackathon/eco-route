/**
 * Server Entry Point
 * Starts the Express application
 */

import dotenv from 'dotenv';
import { createApp } from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = createApp();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Compare endpoint: http://localhost:${PORT}/compare`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default server;