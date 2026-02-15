import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

/**
 * Test database connection on startup
 * Fails fast with clear error message if connection is invalid
 */
export async function testDatabaseConnection(): Promise<void> {
  try {
    console.log("Testing database connection...");
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database');
    const dbName = result.rows[0]?.database;
    console.log(`✓ Database connection successful (connected to: ${dbName})`);
  } catch (error) {
    const err = error as Error;
    console.error("✗ Database connection failed!");
    console.error(`Error: ${err.message}`);
    console.error("\nPossible causes:");
    console.error("- DATABASE_URL is invalid or malformed");
    console.error("- Database server is not reachable");
    console.error("- Network/firewall issues");
    console.error("- Incorrect credentials");
    throw new Error(`Database connection test failed: ${err.message}`);
  }
}
