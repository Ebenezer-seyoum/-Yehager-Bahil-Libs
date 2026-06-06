import process from "node:process";
import { Client } from "../../node_modules/@types/pg/index.js";
import { hashPassword } from "../lib/auth/password.js";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Administrator";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!email) {
  throw new Error("ADMIN_EMAIL is required");
}

if (!password || password.length < 8) {
  throw new Error("ADMIN_PASSWORD is required and must be at least 8 characters");
}

const adminDatabaseUrl = databaseUrl;
const adminEmail = email;
const adminPassword = password;

async function run() {
  const client = new Client({
    connectionString: adminDatabaseUrl,
  });

  await client.connect();

  try {
    const passwordHash = await hashPassword(adminPassword);
    const result = await client.query<{
      id: string;
      email: string;
    }>(
      `
        INSERT INTO users (email, name, password_hash, role)
        VALUES ($1, $2, $3, 'admin')
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = 'admin',
          updated_at = NOW()
        RETURNING id, email
      `,
      [adminEmail, name, passwordHash],
    );

    const user = result.rows[0];
    console.log(`Admin account ready for ${user.email}`);
  } finally {
    await client.end();
  }
}

void run();
