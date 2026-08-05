import { Request } from 'express';
import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Profile as GitHubProfile, Strategy as GitHubStrategy } from 'passport-github2';
import { Op } from 'sequelize';
import { AuthProvider, User } from '../models/User';
import { comparePassword } from '../utils/password';
import { env } from './env';
import { logger } from './logger';

export interface JwtPayload {
  sub: number;
  username: string;
}

/**
 * Local strategy: authenticates by *either* username or email, plus password.
 * The client sends both values under a single `login` field.
 */
passport.use(
  new LocalStrategy(
    { usernameField: 'login', passwordField: 'password' },
    async (login: string, password: string, done) => {
      try {
        const user = await User.findOne({
          where: { [Op.or]: [{ username: login }, { email: login }] },
        });

        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        if (!user.password) {
          // Account was created via OAuth and has no local password set
          return done(null, false, {
            message: `This account uses ${user.provider} sign-in. Please log in with ${user.provider}.`,
          });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);

/**
 * JWT strategy: validates the short-lived access token sent in the
 * `Authorization: Bearer <token>` header and loads the corresponding user.
 */
const jwtOptions: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_ACCESS_SECRET,
  passReqToCallback: true,
};

passport.use(
  new JwtStrategy(jwtOptions, async (_req: Request, payload: JwtPayload, done) => {
    try {
      const user = await User.findByPk(payload.sub);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err as Error, false);
    }
  }),
);

/** Finds an existing OAuth-linked user or creates a new one. */
async function findOrCreateOAuthUser(params: {
  provider: AuthProvider;
  providerId: string;
  email: string | undefined;
  displayName: string | undefined;
}): Promise<User> {
  const { provider, providerId, email, displayName } = params;

  const existing = await User.findOne({ where: { provider, providerId } });
  if (existing) return existing;

  // If a local account already exists with this email, we still create a
  // separate provider-linked record rather than silently merging accounts,
  // to avoid account-takeover via an unverified OAuth email match.
  const baseUsername = (displayName || email?.split('@')[0] || `${provider}_user`).replace(/[^a-zA-Z0-9_.-]/g, '');
  let username = baseUsername || `${provider}_${providerId}`;
  let suffix = 0;
  // Ensure username uniqueness
  while (await User.findOne({ where: { username } })) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  const emailToStore = email || `${provider}_${providerId}@no-email.invalid`;

  return User.create({
    username,
    email: emailToStore,
    password: null,
    provider,
    providerId,
  });
}

if (env.googleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: AuthProvider.GOOGLE,
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
} else {
  logger.warn('Google OAuth is disabled (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set)');
}

if (env.githubOAuthEnabled) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GitHubProfile,
        done: (err: Error | null, user?: User) => void,
      ) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: AuthProvider.GITHUB,
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.username || profile.displayName,
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
} else {
  logger.warn('GitHub OAuth is disabled (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set)');
}

export { passport };
