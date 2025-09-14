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
const HOST = process.env.HOST || 'localhost';

// Create Express app
const app = createApp();

// PORTをnumber型に変換
const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

// Start server
const server = app.listen(port, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${port} in ${NODE_ENV} mode`);
  console.log(`📍 Health check: http://${HOST}:${port}/health`);
  console.log(`🔄 Compare endpoint: http://${HOST}:${port}/compare`);
  console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
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
