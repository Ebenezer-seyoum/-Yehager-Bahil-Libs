import { config } from "dotenv";
import { z } from "zod";

config();

const url = z.string().trim().pipe(z.url());
const booleanString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: url,
  NEXTAUTH_URL: url,
  NEXTAUTH_SECRET: z.string().min(16),
  AUTH_SHARED_JWT_ISSUER: z.string().min(1).default("yehager-web"),
  AUTH_SHARED_JWT_AUDIENCE: z.string().min(1).default("yehager-api"),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_S3_PUBLIC_BASE_URL: url,
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  FRONTEND_APP_URL: url.default("http://localhost:3000"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: booleanString.optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_INFO_USER: z.string().min(1).optional(),
  SMTP_INFO_PASS: z.string().min(1).optional(),
  SMTP_TEAM_USER: z.string().min(1).optional(),
  SMTP_TEAM_PASS: z.string().min(1).optional(),
  SMTP_SUPPORT_USER: z.string().min(1).optional(),
  SMTP_SUPPORT_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_NOTIFICATIONS_FROM: z.string().min(1).optional(),
  EMAIL_SUPPORT_FROM: z.string().min(1).optional(),
  EMAIL_TEAM_FROM: z.string().min(1).optional(),
  EMAIL_LOGO_URL: url.optional(),
  EMAIL_LOGO_MARK_URL: url.optional(),
  SUPPORT_IMAP_HOST: z.string().min(1).optional(),
  SUPPORT_IMAP_PORT: z.coerce.number().int().positive().optional(),
  SUPPORT_IMAP_SECURE: booleanString.optional(),
  SUPPORT_IMAP_USER: z.string().min(1).optional(),
  SUPPORT_IMAP_PASS: z.string().min(1).optional(),
  SUPPORT_IMAP_MAILBOX: z.string().min(1).default("INBOX"),
  SUPPORT_IMAP_SYNC_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  SUPPORT_NOTIFICATION_EMAIL: z.string().email().optional(),
  PRODUCTION_EMAIL: z.string().email().default("naomiinvestments2100@gmail.com"),
  PRODUCTION_PHONE: z.string().min(1).default("+251 92 394 0978"),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
  TELEGRAM_MINI_APP_SHORT_NAME: z.string().min(1).optional(),
  TELEGRAM_GROUP_ID: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse(process.env);
