import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("MYSQL_DATABASE_URL must be set to run migrations");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "mysql",
  dbCredentials: {
    url: dbUrl,
  },
});
