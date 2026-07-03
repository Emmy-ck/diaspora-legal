const crypto = require('crypto');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Wraps async route/controller handlers so rejected promises are forwarded
// to Express' error-handling middleware instead of needing try/catch everywhere.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Generates a random raw token to send to the user (e.g. via email) plus its
// SHA-256 hash to persist in the database. Never store the raw token - if the
// database is ever compromised, hashed tokens alone can't be used to reset
// accounts.
const generateToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

module.exports = { AppError, asyncHandler, generateToken, hashToken };
