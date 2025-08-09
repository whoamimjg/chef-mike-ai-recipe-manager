# Deployment Guide - Chef Mike's AI Recipe Manager

## GitHub Repository Setup

### Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and log in
2. Click "New repository" or go to [github.com/new](https://github.com/new)
3. Repository name: `chef-mike-ai-recipe-manager`
4. Description: "A comprehensive recipe management and AI-powered cooking companion platform"
5. Choose Public or Private
6. **Do NOT initialize with README** (we already have one)
7. Click "Create repository"

### Step 2: Push to GitHub
Since there's a Git lock issue, you'll need to run these commands manually in the shell:

```bash
# Remove the lock file if it exists
rm -f .git/index.lock

# Add all changes
git add .

# Commit the changes
git commit -m "Prepare repository for GitHub deployment

- Enhanced .gitignore with comprehensive exclusions
- Added detailed README.md with setup instructions
- Documented all features and tech stack
- Included deployment guides for Replit and traditional hosting"

# Add your GitHub repository as origin (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/chef-mike-ai-recipe-manager.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Repository Settings
After pushing to GitHub:

1. **Add Repository Topics**: Go to your repo → Settings → General
   - Add topics: `recipe-manager`, `ai`, `react`, `nodejs`, `typescript`, `meal-planning`, `openai`

2. **Set Repository Description**: 
   - "A comprehensive recipe management and AI-powered cooking companion platform that transforms home cooking experiences through intelligent meal planning, personalized recommendations, and smart kitchen management."

3. **Enable Issues and Wiki** (optional but recommended)

## Environment Variables for Production

When deploying to production platforms, you'll need these environment variables:

### Required Variables
```env
# Database - PostgreSQL connection
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=your_postgres_host
PGPORT=5432
PGUSER=your_postgres_user  
PGPASSWORD=your_postgres_password
PGDATABASE=your_database_name

# Authentication
SESSION_SECRET=your_super_secure_session_secret_min_32_chars
REPLIT_DOMAINS=your-domain.com,another-domain.com

# AI Features (Required for core functionality)
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### Optional Variables
```env
# OAuth Providers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# Payment Processing
STRIPE_SECRET_KEY=sk_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_your_stripe_public_key

# Email Services
SENDGRID_API_KEY=your_sendgrid_api_key
```

## Deployment Platforms

### 1. Replit (Current Platform) ✅
- Already configured and working
- Environment variables in Replit Secrets
- Automatic deployment on code changes
- PostgreSQL database included

### 2. Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### 3. Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 4. Heroku
```bash
# Install Heroku CLI and login
heroku create chef-mike-recipe-manager

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set OPENAI_API_KEY=your_key_here
heroku config:set SESSION_SECRET=your_secret_here

# Deploy
git push heroku main
```

### 5. DigitalOcean App Platform
1. Connect your GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
3. Add environment variables in the dashboard
4. Deploy

## Post-Deployment Checklist

### ✅ Verify Core Features
- [ ] User authentication works
- [ ] Recipe creation and editing
- [ ] Meal planning calendar
- [ ] Shopping list generation
- [ ] Barcode scanning (mobile)
- [ ] AI recommendations
- [ ] Cost calculations

### ✅ Test API Integrations  
- [ ] OpenAI API responses
- [ ] Kroger API pricing (if configured)
- [ ] Email functionality (if configured)
- [ ] Payment processing (if configured)

### ✅ Performance Checks
- [ ] Page load times < 3 seconds
- [ ] Mobile responsiveness
- [ ] Database query performance
- [ ] Image upload functionality

### ✅ Security Verification
- [ ] All environment variables secure
- [ ] No API keys in client code
- [ ] HTTPS enabled
- [ ] Session management working
- [ ] Proper logout functionality

## Mobile App Development (Next Phase)

The codebase is prepared for React Native development:

### Shared Code Structure
- `shared/schema.ts` - Database schemas (reusable)
- API endpoints designed for mobile consumption
- TypeScript types exported for mobile use

### Mobile Development Options
1. **React Native CLI** - Full native features
2. **Expo** - Faster development, some limitations
3. **PWA** - Web-based mobile app (quickest)

### Repository Structure for Mobile
```
chef-mike-ai-recipe-manager/
├── web/                    # Current React app
├── mobile/                 # React Native app
├── shared/                 # Shared utilities and types  
├── server/                 # API server (unchanged)
└── docs/                   # Documentation
```

---

**Next Steps:**
1. Run the Git commands above to push to GitHub
2. Choose a production deployment platform
3. Configure environment variables
4. Test all functionality in production
5. Begin mobile app development planning