// 1. Load environment variables
require('dotenv').config();

const http = require('http');

const logger = require('./utils/logger');

// 2. Initialize the Express application
const app = require('./app');

// 3. Database connection
const { connectDB, sequelize } = require('./config/database');

// 4. Socket.IO initialization
const { initializeSocket, getIO } = require('./config/socket');

const SHUTDOWN_TIMEOUT_MS = 10000;

const PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_ATTEMPTS = 10;

// Tries `startPort`, and if it's already taken, keeps incrementing and retrying
// until a free port is found (or we give up after MAX_PORT_ATTEMPTS).
const listenOnAvailablePort = (httpServer, startPort, attempt = 0) =>
  new Promise((resolve, reject) => {
    const port = startPort + attempt;

    const onError = (err) => {
      httpServer.removeListener('listening', onListening);

      if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
        logger.warn(`Port ${port} is already in use, trying port ${port + 1}...`);
        resolve(listenOnAvailablePort(httpServer, startPort, attempt + 1));
        return;
      }

      reject(err);
    };

    const onListening = () => {
      httpServer.removeListener('error', onError);
      resolve(port);
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(port);
  });

const startServer = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Create the raw HTTP server from the Express app
    const httpServer = http.createServer(app);

    // Initialize WebSockets on top of the HTTP server
    initializeSocket(httpServer);

    // Start listening for requests, falling back to the next port if busy
    const port = await listenOnAvailablePort(httpServer, PORT);
    if (port !== PORT) {
      logger.warn(`Requested port ${PORT} was unavailable. Using port ${port} instead.`);
    }
    logger.success(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);

    // Graceful shutdown
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.warn(`${signal} received. Shutting down gracefully...`);

      // Safety net: if something keeps the event loop busy (e.g. a client that
      // never disconnects), don't hang forever - force exit after a timeout.
      const forceExitTimer = setTimeout(() => {
        logger.error(`Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms. Forcing exit.`);
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      forceExitTimer.unref();

      // Idle keep-alive HTTP sockets can otherwise sit open for Node's default
      // keep-alive timeout, so force-close them immediately instead of waiting.
      httpServer.closeAllConnections?.();

      // Socket.IO owns the httpServer it was attached to, so `getIO().close()`
      // both disconnects every connected client (rather than waiting for them
      // to time out on their own) and closes the underlying HTTP server.
      getIO()
        .close()
        .then(async () => {
          logger.info('Socket.IO connections closed.');

          try {
            await sequelize.close();
            logger.info('Database connection closed.');
          } catch (dbErr) {
            logger.error('Error closing database connection:', dbErr.message);
          }

          logger.info('HTTP server closed.');
          clearTimeout(forceExitTimer);
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
