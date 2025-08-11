import { auth, requiresAuth } from 'express-openid-connect';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';

export function setupAuth0(app: Express) {
  // Auth0 configuration
  const issuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL?.startsWith('https://') 
    ? process.env.AUTH0_ISSUER_BASE_URL 
    : `https://${process.env.AUTH0_ISSUER_BASE_URL}`;
    
  const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET || 'your-secret-key',
    baseURL: process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000',
    clientID: 'LJkFtXalLcPBRy8JXsIwE9u1uFjBWASo',
    issuerBaseURL: issuerBaseURL,
  };

  // Apply Auth0 middleware
  app.use(auth(config));

  // Auth0 routes
  app.get('/auth0/login', (req, res) => {
    res.oidc.login({
      returnTo: '/',
      authorizationParams: {
        redirect_uri: `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/auth0/callback`,
      },
    });
  });

  app.get('/auth0/logout', (req, res) => {
    res.oidc.logout({
      returnTo: `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}`,
    });
  });

  app.get('/auth0/callback', async (req, res) => {
    try {
      if (req.oidc.isAuthenticated()) {
        const user = req.oidc.user;
        
        // Create or update user in your database
        await storage.upsertUser({
          id: user?.sub || '',
          email: user?.email || '',
          firstName: user?.given_name || '',
          lastName: user?.family_name || '',
          profileImageUrl: user?.picture || '',
        });
      }
      
      res.redirect('/');
    } catch (error) {
      console.error('Auth0 callback error:', error);
      res.redirect('/?error=auth');
    }
  });

  // Get current user endpoint
  app.get('/api/auth0/user', async (req, res) => {
    try {
      if (!req.oidc.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const auth0User = req.oidc.user;
      const user = await storage.getUser(auth0User?.sub || '');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

// Auth0 middleware for protected routes
export const requiresAuth0: RequestHandler = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};