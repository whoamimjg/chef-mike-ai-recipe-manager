import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || profile.displayName || 'User',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value || '',
            plan: 'free'
          });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));

    // Google OAuth routes
    app.get("/api/auth/google", 
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get("/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login?error=oauth" }),
      (req, res) => {
        res.redirect("/"); // Redirect to home page after successful login
      }
    );
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            email: profile.emails?.[0]?.value || '',
            firstName: profile.displayName || profile.username || 'User',
            lastName: '',
            profileImageUrl: profile.photos?.[0]?.value || '',
            plan: 'free'
          });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));

    // GitHub OAuth routes
    app.get("/api/auth/github", 
      passport.authenticate("github", { scope: ["user:email"] })
    );

    app.get("/api/auth/github/callback",
      passport.authenticate("github", { failureRedirect: "/login?error=oauth" }),
      (req, res) => {
        res.redirect("/"); // Redirect to home page after successful login
      }
    );
  }

  // Serialize/deserialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Logout route
  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      req.session.destroy(() => {
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};