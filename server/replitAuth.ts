import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

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
      secure: false, // Disable secure for development  
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    console.log("OAuth verify callback triggered");
    console.log("Token claims:", tokens.claims());
    
    const user = { isAuthenticated: true };
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    
    console.log("User session updated:", JSON.stringify(user, null, 2));
    console.log("User session created, calling verified callback");
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    console.log("Setting up Replit Auth strategy for domain:", domain);
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`Strategy registered: replitauth:${domain}`);
  }

  passport.serializeUser((user: any, cb) => {
    console.log("Serializing user:", user);
    cb(null, user);
  });
  passport.deserializeUser((user: any, cb) => {
    console.log("Deserializing user:", user);
    cb(null, user);
  });

  app.get("/api/login", (req, res, next) => {
    console.log("Login request received for domain:", req.hostname);
    console.log("Available strategy:", `replitauth:${req.hostname}`);
    console.log("Available domains:", process.env.REPLIT_DOMAINS);
    console.log("Request headers host:", req.get('host'));
    
    // Try to find a matching strategy
    const availableDomains = process.env.REPLIT_DOMAINS!.split(",");
    let matchingDomain = availableDomains.find(domain => 
      req.hostname === domain || req.get('host')?.includes(domain)
    );
    
    if (!matchingDomain) {
      console.error("No matching domain found for hostname:", req.hostname);
      console.log("Using first available domain as fallback:", availableDomains[0]);
      matchingDomain = availableDomains[0];
    }
    
    const strategyName = `replitauth:${matchingDomain}`;
    console.log("Using strategy:", strategyName);
    
    passport.authenticate(strategyName)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("OAuth callback received for domain:", req.hostname);
    console.log("Callback URL query params:", req.query);
    
    // Find matching domain for callback too
    const availableDomains = process.env.REPLIT_DOMAINS!.split(",");
    let matchingDomain = availableDomains.find(domain => 
      req.hostname === domain || req.get('host')?.includes(domain)
    );
    
    if (!matchingDomain) {
      console.error("No matching domain found for callback hostname:", req.hostname);
      matchingDomain = availableDomains[0];
    }
    
    const strategyName = `replitauth:${matchingDomain}`;
    console.log("Using callback strategy:", strategyName);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
      failureFlash: false
    })(req, res, (err: any) => {
      if (err) {
        console.error("OAuth callback error:", err);
        return res.redirect("/api/login");
      }
      console.log("OAuth callback completed successfully");
    });
  });

  app.get("/api/logout", (req, res) => {
    console.log("Logout request received");
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("https://airecipemanager.com/");
      }
      
      // Destroy the session
      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error("Session destroy error:", destroyErr);
          }
          console.log("Session destroyed, redirecting to landing page");
          
          // Clear the session cookie
          res.clearCookie('connect.sid');
          
          // Redirect to the actual landing page domain
          res.redirect("https://airecipemanager.com/");
        });
      } else {
        console.log("No session to destroy, redirecting to landing page");
        res.redirect("https://airecipemanager.com/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const session = req.session as any;

  console.log('Checking authentication for user:', user?.claims?.sub || session?.userId);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Is authenticated:', req.isAuthenticated());

  // Check for local session authentication first (signup/login flow)
  if (session && session.userId) {
    console.log('Local session authenticated, user ID:', session.userId);
    return next();
  }

  // Check for Replit Auth
  if (!req.isAuthenticated()) {
    console.log("User not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user || !user.expires_at) {
    console.log("No user or expiry data found");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log("Token still valid, proceeding");
    return next();
  }

  console.log("Token expired, attempting refresh");
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token available");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("Token refreshed successfully");
    return next();
  } catch (error) {
    console.log("Token refresh failed:", error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
