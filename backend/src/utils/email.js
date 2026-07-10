const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  } else {
    // No SMTP configured (typical for local dev). We still want the app to
    // work end-to-end, so emails are written to the server log instead of
    // being sent. This is clearly NOT suitable for production - set
    // SMTP_HOST/USER/PASS to send real mail.
    transporter = {
      sendMail: async (options) => {
        logger.warn(
          `SMTP not configured - logging email instead of sending it.\n` +
            `  To: ${options.to}\n  Subject: ${options.subject}\n  Body:\n${options.text}\n`
        );
        return { messageId: 'console-transport' };
      },
    };
  }

  return transporter;
}

async function sendVerificationEmail(user, rawToken) {
  const link = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: user.email,
    subject: 'Verify your SkyChat email address',
    text:
      `Hi ${user.username},\n\n` +
      `Confirm your email address to finish setting up your SkyChat account:\n${link}\n\n` +
      `This link expires in 24 hours. If you didn't create a SkyChat account, you can ignore this email.`,
    html:
      `<p>Hi ${user.username},</p>` +
      `<p>Confirm your email address to finish setting up your SkyChat account:</p>` +
      `<p><a href="${link}">${link}</a></p>` +
      `<p>This link expires in 24 hours. If you didn't create a SkyChat account, you can ignore this email.</p>`,
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: user.email,
    subject: 'Reset your SkyChat password',
    text:
      `Hi ${user.username},\n\n` +
      `We received a request to reset your SkyChat password. Choose a new one here:\n${link}\n\n` +
      `This link expires in 1 hour. If you didn't request this, you can safely ignore this email - ` +
      `your password will not change.`,
    html:
      `<p>Hi ${user.username},</p>` +
      `<p>We received a request to reset your SkyChat password. Choose a new one here:</p>` +
      `<p><a href="${link}">${link}</a></p>` +
      `<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
