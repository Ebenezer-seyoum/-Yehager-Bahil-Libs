import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "../../../node_modules/@types/pg/index.js";
import { env } from "../../config/env.js";
import * as schema from "./schema.js";

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pgPool, { schema });

export type Database = typeof db;
