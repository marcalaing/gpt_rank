import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { waitForDatabase, closeDatabase } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

import { setStripeAvailable, isStripeAvailable } from "./stripeStatus";

// Global error handlers - catch unhandled errors before they crash the app
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error but don't crash the process
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to gracefully shutdown here
  // For now, we log and continue
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
    
    // Close database connections
    await closeDatabase();
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');
  try {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const { db } = await import('./db');
    
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.warn("STRIPE_SECRET_KEY not set - Stripe features will be disabled");
    setStripeAvailable(false);
    return;
  }

  if (!databaseUrl) {
    console.warn("DATABASE_URL not set - skipping Stripe database setup");
    setStripeAvailable(false);
    return;
  }

  try {
    // Initialize Stripe client (now using standard SDK in stripeClient.ts)
    const { getStripeClient } = await import("./stripeClient");
    const stripe = getStripeClient();

    if (!stripe) {
      throw new Error('Failed to initialize Stripe client');
    }

    console.log("Stripe client initialized successfully");
    setStripeAvailable(true);

    // Note: Webhook setup and sync removed (Replit-specific).
    // If you need webhooks, configure them manually in Stripe Dashboard
    // and point them to: https://your-domain.com/api/stripe/webhook
    console.log("Stripe ready. Configure webhooks manually in Stripe Dashboard if needed.");

  } catch (error) {
    console.warn("Stripe not available - billing features disabled. Reason:", (error as Error).message);
    setStripeAvailable(false);
  }
}

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!isStripeAvailable()) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const { WebhookHandlers } = await import("./webhookHandlers");
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Step 1: Wait for database to be available
    console.log('Waiting for database connection...');
    await waitForDatabase();
    
    // Step 2: Run migrations
    await runMigrations();
    
    // Step 3: Initialize Stripe
    await initStripe();
    
    // Step 4: Register routes
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
      },
    );
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
