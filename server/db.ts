import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as NodePool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

// Use production database if available, otherwise fall back to development
const databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or PROD_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Using database URL:", databaseUrl.replace(/:[^:@]+@/, ':***@')); // Log URL with password masked

let pool: NodePool;
let db: ReturnType<typeof drizzleNode>;

if (process.env.PROD_DATABASE_URL) {
  // Use standard PostgreSQL driver for production
  pool = new NodePool({ connectionString: databaseUrl });
  db = drizzleNode(pool, { schema });
} else {
  // Use standard PostgreSQL driver for development too
  pool = new NodePool({ connectionString: databaseUrl });
  db = drizzleNode(pool, { schema });
}

export { pool, db };