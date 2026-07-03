const User = require('../models/User');
const emailService = require('./emailService');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { AppError, hashToken } = require('../utils/helpers');

const buildAuthResponse = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email, tokenVersion: user.tokenVersion };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
  return { user, accessToken, refreshToken };
};

const register = async ({ firstName, lastName, email, password, phone, role }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: role || 'client',
  });

  const verificationToken = user.createEmailVerificationToken();
  await user.save();
  await emailService.sendVerificationEmail(user, verificationToken);

  return buildAuthResponse(user);
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return buildAuthResponse(user);
};

const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findByPk(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User no longer exists or is inactive', 401);
  }

  if (user.tokenVersion !== decoded.tokenVersion) {
    throw new AppError('Session has expired, please log in again', 401);
  }

  return buildAuthResponse(user);
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

const verifyEmail = async (rawToken) => {
  const hashedToken = hashToken(rawToken);
  const user = await User.findOne({ where: { emailVerificationToken: hashedToken } });

  if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw new AppError('Verification link is invalid or has expired', 400);
  }

  user.isVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  return user;
};

// Always resolves successfully (even for unknown emails / already-verified
// accounts) so callers can't use this endpoint to enumerate registered users.
const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user || user.isVerified) {
    return;
  }

  const verificationToken = user.createEmailVerificationToken();
  await user.save();
  await emailService.sendVerificationEmail(user, verificationToken);
};

// Same anti-enumeration behavior as resendVerificationEmail.
const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return;
  }

  const resetToken = user.createPasswordResetToken();
  await user.save();
  await emailService.sendPasswordResetEmail(user, resetToken);
};

const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = hashToken(rawToken);
  const user = await User.findOne({ where: { passwordResetToken: hashedToken } });

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw new AppError('Reset link is invalid or has expired', 400);
  }

  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.tokenVersion += 1; // invalidate any previously issued tokens/sessions
  await user.save();

  await emailService.sendPasswordChangedEmail(user);

  return buildAuthResponse(user);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  user.tokenVersion += 1; // invalidate any previously issued tokens/sessions
  await user.save();

  await emailService.sendPasswordChangedEmail(user);

  return buildAuthResponse(user);
};

// Invalidates every access/refresh token issued so far for this user by
// bumping tokenVersion, effectively logging them out of all devices/sessions.
const logoutAllDevices = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  user.tokenVersion += 1;
  await user.save();
};

module.exports = {
  register,
  login,
  refresh,
  getUserById,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutAllDevices,
};
