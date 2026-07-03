const { verifyAccessToken } = require('../config/jwt');
const { asyncHandler } = require('../utils/helpers');
const User = require('../models/User');

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

// Decodes the token if present and stashes the raw payload, but never blocks
// the request. Runs globally so downstream middleware/routes know whether a
// (possibly stale) token was presented before deciding whether to enforce
// authentication via `protect`.
const attachUser = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.tokenPayload = null;
    return next();
  }

  try {
    req.tokenPayload = verifyAccessToken(token);
  } catch (error) {
    req.tokenPayload = null;
  }

  next();
};

// Blocks the request unless the token is valid AND still represents an
// active session: the user must still exist, be active, and the token's
// tokenVersion must match the user's current tokenVersion. This is what
// makes logout-all / password reset / password change immediately invalidate
// every previously issued token instead of waiting for natural expiry.
const protect = asyncHandler(async (req, res, next) => {
  if (!req.tokenPayload) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }

  const user = await User.findByPk(req.tokenPayload.id);

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }

  if (user.tokenVersion !== req.tokenPayload.tokenVersion) {
    return res.status(401).json({ success: false, message: 'Session has expired, please log in again' });
  }

  req.user = user;
  next();
});

module.exports = { attachUser, protect };
