import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as NodePool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

// Production database configuration (read-only)
let prodDatabaseUrl = process.env.PROD_DATABASE_URL;
if (process.env.PROD_PGUSER && process.env.PROD_PGPASSWORD && process.env.PROD_PGDATABASE) {
  const host = process.env.PROD_DATABASE_URL || 'encrypted-final-pg10-jan-1-2019.cydo4oi1ymxb.us-east-1.rds.amazonaws.com';
  const port = process.env.PROD_PGPORT || '5432';
  prodDatabaseUrl = `postgresql://${process.env.PROD_PGUSER}:${process.env.PROD_PGPASSWORD}@${host}:${port}/${process.env.PROD_PGDATABASE}`;
}

// Replit database configuration (writable)
const replitDatabaseUrl = process.env.DATABASE_URL;

if (!prodDatabaseUrl && !replitDatabaseUrl) {
  throw new Error(
    "Either PROD_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Production database URL:", prodDatabaseUrl?.replace(/:[^:@]+@/, ':***@') || 'not configured');
console.log("Replit database URL:", replitDatabaseUrl?.replace(/:[^:@]+@/, ':***@') || 'not configured');

// Production database connection (read-only)
let prodPool: NodePool | null = null;
let prodDb: ReturnType<typeof drizzleNode> | null = null;

if (prodDatabaseUrl) {
  prodPool = new NodePool({ connectionString: prodDatabaseUrl });
  prodDb = drizzleNode(prodPool, { schema });
}

// Replit database connection (writable)
let replitPool: NodePool | null = null;
let replitDb: ReturnType<typeof drizzleNode> | null = null;

if (replitDatabaseUrl) {
  replitPool = new NodePool({ connectionString: replitDatabaseUrl });
  replitDb = drizzleNode(replitPool, { schema });
}

// Export both connections
export { 
  prodPool, 
  prodDb, 
  replitPool, 
  replitDb
};

// Keep legacy exports for backward compatibility  
export const pool = prodPool || replitPool;
export const db = prodDb || replitDb;