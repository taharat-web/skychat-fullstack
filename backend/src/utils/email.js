const env = require('../config/env');
const logger = require('./logger');

// Brevo API দিয়ে ইমেইল পাঠানোর ফাংশন
async function sendBrevoEmail({ to, subject, textContent, htmlContent }) {
  if (!env.BREVO_API_KEY) {
    logger.warn(`BREVO_API_KEY missing. Logging email to ${to}\nSubject: ${subject}\nBody: ${textContent}`);
    return;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: "SkyChat", email: env.SMTP_FROM || env.SMTP_USER },
      to: [{ email: to }],
      subject: subject,
      textContent: textContent,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Brevo API Error: ${errorData}`);
  }
}

// ভেরিফিকেশন ইমেইল
async function sendVerificationEmail(user, rawToken) {
  const link = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  
  const subject = 'Verify your SkyChat email address';
  const textContent = `Hi ${user.username},\n\nConfirm your email address to finish setting up your SkyChat account:\n${link}\n\nThis link expires in 24 hours.`;
  const htmlContent = `
    <p>Hi ${user.username},</p>
    <p>Confirm your email address to finish setting up your SkyChat account:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 24 hours. If you didn't create a SkyChat account, you can ignore this email.</p>
  `;

  await sendBrevoEmail({ to: user.email, subject, textContent, htmlContent });
}

// পাসওয়ার্ড রিসেট ইমেইল
async function sendPasswordResetEmail(user, rawToken) {
  const link = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  
  const subject = 'Reset your SkyChat password';
  const textContent = `Hi ${user.username},\n\nWe received a request to reset your SkyChat password. Choose a new one here:\n${link}\n\nThis link expires in 1 hour.`;
  const htmlContent = `
    <p>Hi ${user.username},</p>
    <p>We received a request to reset your SkyChat password. Choose a new one here:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `;

  await sendBrevoEmail({ to: user.email, subject, textContent, htmlContent });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
