import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with better error handling and Railway-compatible settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // SSL config for Railway (handles both internal and external connections)
  ssl: process.env.DATABASE_URL.includes('postgres.railway.internal') 
    ? false  // Internal Railway connections don't use SSL
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false } // External production connections
      : false, // Development
});

// Add error handler to prevent crashes on connection errors
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
  // Don't crash the process - let other connections continue
});

export const db = drizzle(pool, { schema });

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

// Test connection and wait for database to be ready
export async function waitForDatabase(maxRetries = 10, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database connection successful');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }
    }
  }
}
