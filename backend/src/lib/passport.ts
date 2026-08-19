import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile } from 'passport-google-oauth20';
import { env } from '../config/env';
import { findOrCreateGoogleUser, type PublicUser } from '../services/auth.service';

/** OAuth is optional config — the rest of auth works without it. */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function configurePassport(): typeof passport {
  if (!isGoogleOAuthConfigured()) return passport;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            done(new Error('Google account did not provide an email address'));
            return;
          }

          const user = await findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name: profile.displayName || undefined,
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );

  return passport;
}

export type GoogleAuthedUser = PublicUser;
export { passport };
