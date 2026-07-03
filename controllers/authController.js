const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('token', accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res) => {
  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: { user, accessToken },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/logout-all (protected) - invalidates every session/device
const logoutAllDevices = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices(req.user.id);
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out from all devices' });
});

// POST /api/auth/refresh-token
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies.refreshToken;
  const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(token);
  setAuthCookies(res, accessToken, newRefreshToken);
  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: { user, accessToken },
  });
});

// GET /api/auth/me (protected) - `protect` already loaded a fresh user record
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

// GET /api/auth/verify-email/:token
const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);
  res.status(200).json({ success: true, message: 'Email verified successfully', data: { user } });
});

// POST /api/auth/resend-verification
const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a verification link has been sent',
  });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent',
  });
});

// PATCH /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken: newRefreshToken } = await authService.resetPassword(
    req.params.token,
    req.body.password
  );
  setAuthCookies(res, accessToken, newRefreshToken);
  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: { user, accessToken },
  });
});

// PATCH /api/auth/change-password (protected)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { user, accessToken, refreshToken: newRefreshToken } = await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword
  );
  setAuthCookies(res, accessToken, newRefreshToken);
  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: { user, accessToken },
  });
});

module.exports = {
  register,
  login,
  logout,
  logoutAllDevices,
  refreshToken,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};
