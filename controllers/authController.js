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
    message: 'Registration successful',
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

// GET /api/auth/me (protected)
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  res.status(200).json({ success: true, data: { user } });
});

module.exports = { register, login, logout, refreshToken, getMe };
