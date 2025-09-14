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
// HOSTは不要（App Runnerでは全インターフェースでリッスンする必要があるため）

// Create Express app
const app = createApp();

// PORTをnumber型に変換
const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port} in ${NODE_ENV} mode`);
  console.log(`📍 Health check: /health`);
  console.log(`🔄 Compare endpoint: /compare`);
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
