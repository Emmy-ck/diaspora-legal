const express = require('express');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerValidation,
  loginValidation,
  emailOnlyValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

// Registration & login
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Session management
router.post('/logout', authController.logout);
router.post('/logout-all', protect, authController.logoutAllDevices);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', protect, authController.getMe);

// Email verification
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', emailOnlyValidation, authController.resendVerification);

// Password reset (logged out) & change (logged in)
router.post('/forgot-password', emailOnlyValidation, authController.forgotPassword);
router.patch('/reset-password/:token', resetPasswordValidation, authController.resetPassword);
router.patch('/change-password', protect, changePasswordValidation, authController.changePassword);

module.exports = router;
