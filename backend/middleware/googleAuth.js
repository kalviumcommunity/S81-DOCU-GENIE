import dotenv from 'dotenv';
dotenv.config();
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { dbUtils } from '../config/database.js';

const defaultCallbackUrl = process.env.NODE_ENV === 'production'
  ? 'https://s81-docu-genie.onrender.com/api/auth/google/callback'
  : 'http://localhost:3001/api/auth/google/callback';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/auth/google/callback`
      : defaultCallbackUrl,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Google profile received for:', profile.emails?.[0]?.value);
      }
      // Find or create user in your database
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(new Error('Google account did not provide an email'), null);
      }
      let user = await dbUtils.getUserByEmail(email);
      if (!user) {
        const oauthSentinel = `OAUTH_${crypto.randomBytes(32).toString('hex')}`;
        const userId = await dbUtils.createUser(
          profile.displayName,
          email,
          oauthSentinel // Use random sentinel instead of empty string
        );
        user = await dbUtils.getUserById(userId);
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await dbUtils.getUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
