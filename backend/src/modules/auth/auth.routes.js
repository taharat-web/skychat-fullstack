const express = require('express');
const { z } = require('zod');
const authService = require('./auth.service');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { authLimiter } = require('../../middleware/rateLimit.middleware');
const env = require('../../config/env');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'skychat_refresh_token';

function refreshCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    function refreshCookieOptions(maxAgeMs) {
      return {
        httpOnly: true,
        secure: true,        // এখানে env.COOKIE_SECURE এর বদলে সরাসরি true করে দিন
        sameSite: 'none',    // 'lax' এর বদলে 'none' করে দিন
        path: '/api/auth',
        maxAge: maxAgeMs,
      };
    }
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
}

function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, refreshCookieOptions(expiresAt.getTime() - Date.now()));
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

// ---- Validation schemas -----------------------------------------------------

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Username must start with a letter and contain only letters, numbers, and underscores');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const signupSchema = z.object({
  username: usernameSchema,
  email: z.string().email('Enter a valid email address').max(255),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const emailSchema = z.object({ email: z.string().email() });
const tokenSchema = z.object({ token: z.string().min(10) });
const resetPasswordSchema = z.object({ token: z.string().min(10), newPassword: passwordSchema });

// ---- Routes -----------------------------------------------------------------

router.post(
  '/signup',
  authLimiter,
  validate({ body: signupSchema }),
  asyncHandler(async (req, res) => {
    const user = await authService.signup(req.body);
    res.status(201).json({
      user,
      message: 'Account created. Check your email to verify your address before logging in.',
    });
  })
);

router.post(
  '/verify-email',
  validate({ body: tokenSchema }),
  asyncHandler(async (req, res) => {
    const user = await authService.verifyEmail(req.body.token);
    res.json({ user, message: 'Email verified. You can now log in.' });
  })
);

router.post(
  '/resend-verification',
  authLimiter,
  validate({ body: emailSchema }),
  asyncHandler(async (req, res) => {
    await authService.resendVerification(req.body.email);
    res.json({ message: 'If that email exists and is unverified, a new verification link was sent.' });
  })
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { user, accessToken, rawRefreshToken, refreshExpiresAt } = await authService.login(
      req.body,
      req.headers['user-agent']
    );
    setRefreshCookie(res, rawRefreshToken, refreshExpiresAt);
    res.json({ user, accessToken });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const existingToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { user, accessToken, rawRefreshToken, refreshExpiresAt } = await authService.refreshSession(
      existingToken,
      req.headers['user-agent']
    );
    setRefreshCookie(res, rawRefreshToken, refreshExpiresAt);
    res.json({ user, accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const existingToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(existingToken);
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  })
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: emailSchema }),
  asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'If that email is registered, a password reset link was sent.' });
  })
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ message: 'Password updated. You can now log in with your new password.' });
  })
);

module.exports = router;
