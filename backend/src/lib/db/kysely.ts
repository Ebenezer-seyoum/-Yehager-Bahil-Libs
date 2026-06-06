import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "../../../node_modules/@types/pg/index.js";
import { env } from "../../config/env.js";

export interface DB {
  users: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: Date;
    updated_at: Date;
  };
  products: {
    id: string;
    name: string;
    description: string | null;
    region: string;
    category: string | null;
    price_usd: string;
    is_active: boolean;
    is_featured: boolean;
    created_at: Date;
    updated_at: Date;
  };
  orders: {
    id: string;
    order_number: string;
    user_email: string;
    customer_name: string;
    total_usd: string;
    status: string;
    payment_status: string;
    created_at: Date;
    updated_at: Date;
  };
  audit_logs: {
    id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    category: string;
    severity: string;
    created_at: Date;
    updated_at: Date;
  };
  system_alerts: {
    id: string;
    title: string;
    message: string;
    type: string;
    severity: string;
    is_resolved: boolean;
    created_at: Date;
    updated_at: Date;
  };
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const kysely = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});
