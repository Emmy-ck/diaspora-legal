const { sendMail } = require('../config/mail');
const logger = require('../utils/logger');

const buildUrl = (path) => `${process.env.CLIENT_URL || 'http://localhost:3000'}${path}`;

const baseTemplate = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
    <h2 style="color: #0f172a;">${title}</h2>
    ${bodyHtml}
    <p style="color: #64748b; font-size: 12px; margin-top: 32px;">Diaspora Legal &mdash; connecting you with trusted legal counsel.</p>
  </div>
`;

// Emails are best-effort: a misconfigured SMTP provider should never break
// registration/password-reset flows, so failures are logged, not thrown.
const sendSafely = async (options) => {
  try {
    await sendMail(options);
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}: ${error.message}`);
  }
};

const sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = buildUrl(`/verify-email/${rawToken}`);

  await sendSafely({
    to: user.email,
    subject: 'Verify your Diaspora Legal account',
    html: baseTemplate(
      'Verify your email',
      `<p>Hi ${user.firstName},</p>
       <p>Thanks for signing up. Please confirm your email address by clicking the button below:</p>
       <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
       <p>Or copy this link: ${verifyUrl}</p>
       <p>This link expires in 24 hours.</p>`
    ),
  });
};

const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = buildUrl(`/reset-password/${rawToken}`);

  await sendSafely({
    to: user.email,
    subject: 'Reset your Diaspora Legal password',
    html: baseTemplate(
      'Reset your password',
      `<p>Hi ${user.firstName},</p>
       <p>We received a request to reset your password. Click the button below to choose a new one:</p>
       <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
       <p>Or copy this link: ${resetUrl}</p>
       <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`
    ),
  });
};

const sendPasswordChangedEmail = async (user) => {
  await sendSafely({
    to: user.email,
    subject: 'Your Diaspora Legal password was changed',
    html: baseTemplate(
      'Password changed',
      `<p>Hi ${user.firstName},</p>
       <p>This is a confirmation that your password was just changed. If you didn't do this, please contact support immediately.</p>`
    ),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail };
