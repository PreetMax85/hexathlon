import { defineConfig } from "drizzle-kit";

// Migrations use the direct (unpooled) Neon URL; the app uses DATABASE_URL.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
});
