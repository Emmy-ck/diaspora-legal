const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Normalizes known Sequelize errors into a { statusCode, message } shape so
// callers don't need to special-case ORM errors on top of AppError instances.
const normalizeError = (err) => {
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return { statusCode: 409, message: `${field} is already in use` };
  }

  if (err.name === 'SequelizeValidationError') {
    const message = err.errors?.map((e) => e.message).join(', ') || 'Validation error';
    return { statusCode: 400, message };
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return { statusCode: 400, message: 'Invalid reference to a related resource' };
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Invalid or expired token' };
  }

  return { statusCode: err.statusCode || 500, message: err.message || 'Internal Server Error' };
};

const errorHandler = (err, req, res, next) => {
  const { statusCode, message } = normalizeError(err);
  const finalStatusCode = res.statusCode !== 200 ? res.statusCode : statusCode;

  logger.error(`${req.method} ${req.originalUrl} - ${message}`);

  res.status(finalStatusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
