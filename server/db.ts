import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as NodePool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

// Use production database if available, otherwise fall back to development
let databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

// If production credentials are provided as separate variables, construct the URL
if (process.env.PROD_PGUSER && process.env.PROD_PGPASSWORD && process.env.PROD_PGDATABASE) {
  const host = process.env.PROD_DATABASE_URL || 'encrypted-final-pg10-jan-1-2019.cydo4oi1ymxb.us-east-1.rds.amazonaws.com';
  const port = process.env.PROD_PGPORT || '5432';
  databaseUrl = `postgresql://${process.env.PROD_PGUSER}:${process.env.PROD_PGPASSWORD}@${host}:${port}/${process.env.PROD_PGDATABASE}`;
}

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or PROD_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Using database URL:", databaseUrl.replace(/:[^:@]+@/, ':***@')); // Log URL with password masked
console.log("Environment check - PROD_PGUSER:", process.env.PROD_PGUSER ? 'present' : 'missing');
console.log("Environment check - PROD_PGDATABASE:", process.env.PROD_PGDATABASE ? 'present' : 'missing');

let pool: NodePool;
let db: ReturnType<typeof drizzleNode>;

// Always use standard PostgreSQL driver
pool = new NodePool({ connectionString: databaseUrl });
db = drizzleNode(pool, { schema });

export { pool, db };