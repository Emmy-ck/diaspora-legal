// Restricts a route to users whose role is in the given allow-list.
// Must run after `protect` (middleware/authMiddleware.js), which sets req.user.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not permitted to perform this action`,
    });
  }

  next();
};

// Allows either the resource owner or a privileged role through (e.g. a
// client managing their own consultation, or an admin managing any of them).
// `getOwnerId(req)` should return the owning user's id for the requested resource.
const authorizeOwnerOrRoles = (getOwnerId, ...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }

  const ownerId = getOwnerId(req);

  if (ownerId && req.user.id === ownerId) {
    return next();
  }

  if (allowedRoles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'You are not allowed to access this resource' });
};

module.exports = { authorize, authorizeOwnerOrRoles };
