// 1. Load environment variables
require('dotenv').config();

const http = require('http');

const logger = require('./utils/logger');

// 2. Initialize the Express application
const app = require('./app');

// 3. Database connection
const { connectDB } = require('./config/database');

// 4. Socket.IO initialization
const { initializeSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Create the raw HTTP server from the Express app
    const httpServer = http.createServer(app);

    // Initialize WebSockets on top of the HTTP server
    initializeSocket(httpServer);

    // Start listening for requests
    httpServer.listen(PORT, () => {
      logger.success(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.warn(`${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection:', err);
      httpServer.close(() => process.exit(1));
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
