const { verifyAccessToken } = require('../config/jwt');

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

// Decodes the token if present and attaches req.user, but never blocks
// the request. Runs globally so downstream routes always know who (if
// anyone) is making the request before deciding whether to enforce auth.
const attachUser = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = verifyAccessToken(token);
  } catch (error) {
    req.user = null;
  }

  next();
};

// Blocks the request unless a valid token was resolved by attachUser.
// Apply this to individual protected routes/routers.
const protect = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }
  next();
};

module.exports = { attachUser, protect };
