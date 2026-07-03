const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_SECURE,
  MAIL_USER,
  MAIL_PASSWORD,
  MAIL_FROM_NAME,
  MAIL_FROM_ADDRESS,
} = process.env;

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT ? Number(MAIL_PORT) : 587,
  secure: MAIL_SECURE === 'true',
  auth: MAIL_USER
    ? {
        user: MAIL_USER,
        pass: MAIL_PASSWORD,
      }
    : undefined,
});

const sendMail = async ({ to, subject, html, text }) => {
  const from = `"${MAIL_FROM_NAME || 'Diaspora Legal'}" <${MAIL_FROM_ADDRESS || MAIL_USER}>`;

  const info = await transporter.sendMail({ from, to, subject, html, text });
  logger.info(`Email sent to ${to}: ${subject} (${info.messageId})`);
  return info;
};

module.exports = { transporter, sendMail };
