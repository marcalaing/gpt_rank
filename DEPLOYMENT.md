# GPT Rank - Deployment Guide for Replit

This guide covers deploying GPT Rank on Replit's infrastructure.

## Prerequisites

Before deploying, ensure you have:

1. **Database**: PostgreSQL database (automatically provisioned on Replit)
2. **Environment Variables**: All required secrets configured
3. **Stripe Account**: For billing functionality (optional)

## Environment Variables

### Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-provisioned by Replit |
| `SESSION_SECRET` | Session encryption key | Generate a random 32+ char string |

### Optional (for AI features)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key | Replit AI Integrations (auto-managed) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL | Replit AI Integrations (auto-managed) |

### Optional (for Stripe billing)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Replit Stripe integration |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Replit Stripe integration |

## Deployment Steps

### 1. Configure Secrets

In your Replit project:
1. Click the "Secrets" tab (lock icon)
2. Add `SESSION_SECRET` with a strong random value
3. Configure Stripe integration if using billing

### 2. Database Setup

The PostgreSQL database is automatically provisioned. Push the schema:

```bash
npm run db:push
```

### 3. Seed Stripe Products (if using billing)

```bash
npx tsx server/seed-stripe-products.ts
```

This creates the subscription plans in Stripe:
- Free: $0/month
- Starter: $29/month
- Pro: $79/month
- Enterprise: $299/month

### 4. Deploy

Click the "Deploy" button in Replit's interface. The deployment will:

1. Build the application
2. Run database migrations
3. Start the Express server
4. Serve the React frontend

### 5. Verify Deployment

After deployment:
1. Visit your `.replit.app` URL
2. Register a new account
3. Create a test project
4. Verify the dashboard loads

## Architecture

### Production Stack

```
Client Request
     ↓
Replit Load Balancer
     ↓
Express Server (port 5000)
     ├── /api/* → API Routes
     └── /* → Vite Static Files
     ↓
PostgreSQL (Neon-backed)
```

### File Structure

```
├── client/          # React frontend (Vite)
├── server/          # Express backend
├── shared/          # Shared types & schemas
├── dist/            # Production build output
└── drizzle/         # Database migrations
```

## Scaling Considerations

### Database

- Replit uses Neon-backed PostgreSQL with automatic scaling
- Connection pooling is handled automatically
- For high traffic, consider adding indexes to frequently queried columns

### API Rate Limits

The job queue has built-in concurrency limits:
- Default: 5 concurrent jobs
- Configure in environment: `JOB_CONCURRENCY_LIMIT`

### Session Storage

- Sessions use PostgreSQL via `connect-pg-simple`
- Session data persists across deployments

## Monitoring

### Health Check

```bash
curl https://your-app.replit.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-01-01T00:00:00.000Z"}
```

### Logs

Access logs via Replit's console or:
1. Go to your Replit project
2. Click "Shell" tab
3. Logs appear in real-time

### Structured Logging

The app uses structured JSON logging:
```
[2025-01-01T00:00:00.000Z] INFO: Message {"context": "value"}
```

Set `LOG_LEVEL` environment variable: `debug`, `info`, `warn`, `error`

## Troubleshooting

### Database Connection Issues

```bash
# Check database status
npm run db:push
```

If connection fails:
1. Verify `DATABASE_URL` is set
2. Check Replit's database panel for status

### Stripe Webhook Not Receiving Events

1. Webhooks are auto-configured by `stripe-replit-sync`
2. Check Stripe Dashboard → Developers → Webhooks
3. Ensure webhook endpoint is publicly accessible

### Session Not Persisting

1. Verify `SESSION_SECRET` is configured
2. Check cookie settings in browser
3. Ensure HTTPS is enforced (automatic on Replit)

## Security Checklist

- [x] Session secret configured
- [x] HTTPS enforced (automatic on Replit)
- [x] SQL injection prevented (Drizzle ORM)
- [x] CSRF protection (session-based auth)
- [x] Input validation (Zod schemas)
- [x] Org isolation enforced in queries
- [x] Secrets not exposed in client

## Rollback

Replit provides automatic checkpoints. To rollback:
1. Go to your Replit project
2. Click "Checkpoints" in the sidebar
3. Select a previous checkpoint
4. Click "Restore"

Database rollback must be done manually if schema changes were made.

## Support

- **Replit Docs**: https://docs.replit.com
- **Stripe Docs**: https://stripe.com/docs
- **Drizzle Docs**: https://orm.drizzle.team

## Subscription Tiers

| Tier | Monthly | Projects | Prompts/Project | Runs/Month |
|------|---------|----------|-----------------|------------|
| Free | $0 | 1 | 5 | 50 |
| Starter | $29 | 3 | 25 | 500 |
| Pro | $79 | 10 | 100 | 2,500 |
| Enterprise | $299 | Unlimited | Unlimited | Unlimited |

Limits are enforced at:
- Project creation
- Prompt creation
- Prompt run execution
- Bulk import operations
