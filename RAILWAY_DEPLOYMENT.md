# Railway Deployment Guide

## Prerequisites

1. Railway account with project created
2. PostgreSQL database provisioned in Railway
3. Required environment variables set in Railway

## Environment Variables

Set these in Railway dashboard:

```bash
# Database (automatically set by Railway when you add Postgres)
DATABASE_URL=postgresql://...

# Session Security (REQUIRED in production)
SESSION_SECRET=<generate-a-random-secure-key>

# AI Provider (for free search and brand onboarding features)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Stripe (optional - only if using billing features)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Node Environment
NODE_ENV=production
PORT=5000
```

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Railway deployment fixes"
git push origin main
```

### 2. Connect Railway to GitHub

1. Go to Railway dashboard
2. Click "New Project" or select existing project
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Node.js and use `nixpacks.toml`

### 3. Add PostgreSQL Database

1. In Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically sets `DATABASE_URL` in your service

### 4. Set Environment Variables

Go to your service → "Variables" and add:

- `SESSION_SECRET` (generate with: `openssl rand -base64 32`)
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `NODE_ENV=production`

### 5. Deploy

Railway will automatically:
- Install dependencies (`npm ci`)
- Run build (`npm run build`)
- Generate migrations (already done, in `migrations/` folder)
- Start the app (`npm start`)

On startup, the app will:
- Wait for database connection (with retries)
- Run Drizzle migrations automatically
- Start Express server on PORT 5000

## Database Migrations

Migrations are automatically run on startup via `server/index.ts`:

```typescript
await runMigrations(); // Runs drizzle-orm/node-postgres/migrator
```

The migration files are in `migrations/` folder (not bundled with server).

## Health Check

Once deployed, test with:

```bash
curl https://your-app.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-..."}
```

## Troubleshooting

### App crashes on startup

1. Check Railway logs for errors
2. Verify `DATABASE_URL` is set correctly
3. Ensure `SESSION_SECRET` is set
4. Check database is accessible (Railway internal DNS: `postgres.railway.internal:5432`)

### Database connection fails

- Railway Postgres uses internal hostname: `postgres.railway.internal`
- SSL is disabled for internal connections (see `server/db.ts`)
- Connection retries up to 10 times with 2s delay

### Migrations fail

- Ensure `migrations/` folder exists in repo root
- Check `drizzle.config.ts` points to correct schema
- Migrations run automatically on startup (no manual `db:push` needed)

### Stripe webhooks not working

1. Configure webhook endpoint in Stripe Dashboard
2. Point to: `https://your-app.up.railway.app/api/stripe/webhook`
3. Set `STRIPE_WEBHOOK_SECRET` in Railway variables
4. Webhook must receive raw body (handled in `server/index.ts`)

## Production Checklist

- [ ] `SESSION_SECRET` set to secure random value
- [ ] `NODE_ENV=production` set
- [ ] `DATABASE_URL` provisioned via Railway Postgres
- [ ] `AI_INTEGRATIONS_OPENAI_API_KEY` set (for AI features)
- [ ] Stripe keys set (if using billing)
- [ ] GitHub repo connected to Railway
- [ ] Health check endpoint returns 200 OK
- [ ] Database migrations completed successfully

## Monitoring

View logs in Railway dashboard:
- Click on your service
- Go to "Deployments" tab
- Click on latest deployment
- View "Logs" in real-time

## Scaling

Railway auto-scales based on:
- Memory: Default 512MB (configurable)
- CPU: Shared (upgrade for dedicated)
- Replicas: 1 (upgrade for horizontal scaling)

Database connection pool is configured for 10 max connections (see `server/db.ts`).
