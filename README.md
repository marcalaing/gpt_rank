# GPTRank - AI Search Visibility Platform

Track your brand's visibility across AI-powered search engines (ChatGPT, Perplexity, Gemini) and get actionable insights to improve your presence.

## Features

- 🎯 Track brand mentions across multiple AI providers
- 📊 Visibility scoring and analytics
- 🔍 Competitor analysis
- 📈 Citation tracking
- 🚨 Real-time alerts
- 💰 Tiered billing with Stripe integration

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and other credentials

# Generate database migrations
npx drizzle-kit generate

# Run development server (includes Vite HMR)
npm run dev
```

Visit `http://localhost:5000`

### Production Build

```bash
# Build client and server
npm run build

# Start production server
npm start
```

## Railway Deployment

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed deployment instructions.

Quick deploy:
1. Connect Railway to your GitHub repo
2. Add PostgreSQL database
3. Set environment variables (SESSION_SECRET, AI keys)
4. Railway auto-deploys on push

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secure session key (production)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - For AI features

Optional:
- `STRIPE_SECRET_KEY` - Billing features
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `NODE_ENV` - development | production
- `PORT` - Server port (default: 5000)

See `.env.example` for full list.

## Database

Uses Drizzle ORM with PostgreSQL.

```bash
# Generate new migrations after schema changes
npx drizzle-kit generate

# Push schema to database (dev only)
npm run db:push
```

Migrations run automatically on production startup.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Radix UI
- **Backend**: Express, TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Express Session + bcrypt
- **Payments**: Stripe
- **AI**: OpenAI, Anthropic, Perplexity, Gemini APIs

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types & schemas
├── migrations/      # Drizzle migrations
├── dist/            # Production build output
└── script/          # Build scripts
```

## License

MIT
