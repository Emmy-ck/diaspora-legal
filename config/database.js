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
  DB_SYNC,
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
    const authStart = Date.now();
    await sequelize.authenticate();
    logger.success(`Database connected: ${DB_NAME}@${DB_HOST}:${DB_PORT} (${Date.now() - authStart}ms)`);

    if (NODE_ENV !== 'production') {
      // `alter: true` diffs every column/index on every table against the DB on each
      // boot, which gets slow as the schema grows. Default to a fast sync that only
      // creates missing tables; opt into the full diff explicitly with DB_SYNC=alter.
      const syncMode = (DB_SYNC || 'fast').toLowerCase();
      const syncStart = Date.now();

      if (syncMode === 'alter') {
        await sequelize.sync({ alter: true });
        logger.info(`Database models synchronized with alter (${Date.now() - syncStart}ms)`);
      } else if (syncMode === 'false' || syncMode === 'skip' || syncMode === 'none') {
        logger.info('Database model sync skipped (DB_SYNC=false)');
      } else {
        await sequelize.sync();
        logger.info(
          `Database models synchronized (${Date.now() - syncStart}ms). ` +
            'Set DB_SYNC=alter to also apply column-level changes (slower).'
        );
      }
    }
  } catch (error) {
    logger.error('Unable to connect to the database', error.message);
    throw error;
  }
};

// 3. Export the Sequelize instance for use throughout the application.
module.exports = { sequelize, connectDB };
