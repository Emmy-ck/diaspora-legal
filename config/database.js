const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_DIALECT,
  DB_LOGGING,
  NODE_ENV,
} = process.env;

if (!DB_NAME || !DB_USER) {
  throw new Error('Missing required database environment variables: DB_NAME and DB_USER must be set');
}

// 1. Establish the MySQL connection using Sequelize.
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST || '127.0.0.1',
  port: DB_PORT ? Number(DB_PORT) : 3306,
  dialect: DB_DIALECT || 'mysql',
  logging: DB_LOGGING === 'true' ? (msg) => logger.info(msg) : false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// 2. Authenticate the connection (verifies credentials/host are correct).
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.success(`Database connected: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);

    if (NODE_ENV !== 'production') {
      // Keeps tables in sync with model definitions during local development.
      // Use proper migrations instead of `alter: true` in production.
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('Unable to connect to the database', error.message);
    throw error;
  }
};

// 3. Export the Sequelize instance for use throughout the application.
module.exports = { sequelize, connectDB };
