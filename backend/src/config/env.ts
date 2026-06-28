import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
  NEXTAUTH_URL: z.url(),
  NEXTAUTH_SECRET: z.string().min(16),
  AUTH_SHARED_JWT_ISSUER: z.string().min(1).default("yehager-web"),
  AUTH_SHARED_JWT_AUDIENCE: z.string().min(1).default("yehager-api"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  FRONTEND_APP_URL: z.url().default("http://localhost:3000"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_NOTIFICATIONS_FROM: z.string().min(1).optional(),
  EMAIL_SUPPORT_FROM: z.string().min(1).optional(),
  EMAIL_TEAM_FROM: z.string().min(1).optional(),
  EMAIL_LOGO_URL: z.url().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  SUPPORT_NOTIFICATION_EMAIL: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
