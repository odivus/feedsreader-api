import { Router } from 'express';
import { env } from '../config/env';
import { passport } from '../config/passport';
import { login, logout, me, oauthCallback, refresh, register } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

// ---- Google OAuth ----
if (env.googleOAuthEnabled) {
  router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed` }),
    oauthCallback,
  );
}

// ---- GitHub OAuth ----
if (env.githubOAuthEnabled) {
  router.get('/github', passport.authenticate('github', { session: false, scope: ['user:email'] }));
  router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed` }),
    oauthCallback,
  );
}

export default router;
