# Auth0 Configuration Guide

## Your Auth0 Application Settings

**Application Type:** Regular Web Application  
**Client ID:** LJkFtXalLcPBRy8JXsIwE9u1uFjBWASo  
**Domain:** dev-013x7zuy63xx6dlh.us.auth0.com

## Required Settings in Auth0 Dashboard

### 1. Allowed Callback URLs
Add these URLs to your Auth0 application settings:

**Development:**
```
http://localhost:5000/callback
```

**Production (Replit):**
```
https://19b58837-3856-4000-95c9-76c07483522c-00-djt1psswov0j.spock.replit.dev/callback
https://your-custom-domain.replit.app/callback
```

### 2. Allowed Logout URLs
```
http://localhost:5000
https://19b58837-3856-4000-95c9-76c07483522c-00-djt1psswov0j.spock.replit.dev
https://your-custom-domain.replit.app
```

### 3. Allowed Web Origins
```
http://localhost:5000
https://19b58837-3856-4000-95c9-76c07483522c-00-djt1psswov0j.spock.replit.dev
https://your-custom-domain.replit.app
```

## How to Configure in Auth0 Dashboard

1. **Go to your Auth0 Dashboard**
   - Navigate to Applications → Applications
   - Click on your application

2. **Update Settings Tab:**
   - Scroll to "Application URIs" section
   - Add the URLs above to respective fields
   - Click "Save Changes"

3. **Enable Social Connections (Optional):**
   - Go to Authentication → Social
   - Enable Google, Facebook, GitHub, etc.
   - Configure each provider with their respective client IDs/secrets

## Current Integration Status

✅ **Auth0 middleware configured**  
✅ **Client ID and Domain set up**  
✅ **Routes configured** (/auth0/login, /auth0/logout)  
✅ **User database integration** (automatic user creation)  
⚠️ **Callback URLs need to be added to Auth0 dashboard**

## Testing Auth0 Integration

1. **Add the callback URLs above to your Auth0 dashboard**
2. **Click "🌐 Sign In with Auth0" in your app**  
3. **You'll be redirected to Auth0's login page**
4. **After authentication, you'll be redirected back to your app**

## Environment Variables Set
- ✅ AUTH0_SECRET
- ✅ AUTH0_ISSUER_BASE_URL
- ✅ AUTH0_CLIENT_ID (hardcoded in configuration)

The Auth0 integration is ready to use once you add the callback URLs to your Auth0 dashboard!