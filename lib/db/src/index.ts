import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const dbUrl = process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "MYSQL_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function buildMysqlUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return raw;
  }
}

const pool = mysql.createPool(buildMysqlUrl(dbUrl));
export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
