CREATE TABLE "employee_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"father_name" varchar(120) NOT NULL,
	"grandfather_name" varchar(120),
	"gender" varchar(20) NOT NULL,
	"date_of_birth" timestamp with time zone,
	"marital_status" varchar(30),
	"country" varchar(120),
	"city" varchar(120),
	"address" text,
	"employment_type" varchar(30),
	"start_date" timestamp with time zone,
	"invite_status" varchar(30) DEFAULT 'none' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_number" text NOT NULL,
	"user_id" uuid,
	"user_email" varchar(320) NOT NULL,
	"customer_name" text NOT NULL,
	"design_title" text NOT NULL,
	"inspiration_note" text,
	"front_image_url" text NOT NULL,
	"side_image_url" text,
	"back_image_url" text,
	"detail_image_url" text,
	"fabric_type" text,
	"embroidery_style" text,
	"color_preference" text,
	"measurement_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_phone" text,
	"contact_telegram" text,
	"contact_address" jsonb,
	"status" varchar(32) DEFAULT 'submitted' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"submitted_at" timestamp with time zone,
	"approved_order_id" uuid,
	"approved_cart_item_id" uuid,
	"quoted_price_usd" numeric(12, 2),
	"family_group_id" uuid,
	"event_id" uuid,
	"estimated_delivery_label" text,
	"estimated_delivery_days_min" integer,
	"estimated_delivery_days_max" integer,
	"email_placeholder_status" varchar(40),
	"email_placeholder_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "family_members" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "item_type" text DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "uploaded_design_id" uuid;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "item_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "selection_type" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "uploaded_design_id" uuid;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "group_type" text DEFAULT 'family_group' NOT NULL;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "selection_type" text;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "product_image" text;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "uploaded_design_id" uuid;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "measurement_id" uuid;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "selection_type" text;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "uploaded_design_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" text DEFAULT 'catalog_order' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_mode" text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" varchar(32) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_status" varchar(32) DEFAULT 'assigned' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assigned_role_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_status" varchar(40) DEFAULT 'never_reset' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_password_reset_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_password_reset_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_password_reset_method" varchar(40);--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_designs" ADD CONSTRAINT "uploaded_designs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_designs" ADD CONSTRAINT "uploaded_designs_approved_order_id_orders_id_fk" FOREIGN KEY ("approved_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_designs" ADD CONSTRAINT "uploaded_designs_family_group_id_family_groups_id_fk" FOREIGN KEY ("family_group_id") REFERENCES "public"."family_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_designs" ADD CONSTRAINT "uploaded_designs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_profiles_user_id_idx" ON "employee_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_requests_user_id_idx" ON "password_reset_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_requests_expires_at_idx" ON "password_reset_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uploaded_designs_submission_number_unique" ON "uploaded_designs" USING btree ("submission_number");--> statement-breakpoint
CREATE INDEX "uploaded_designs_user_email_idx" ON "uploaded_designs" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "uploaded_designs_status_idx" ON "uploaded_designs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uploaded_designs_created_at_idx" ON "uploaded_designs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_role_id_roles_id_fk" FOREIGN KEY ("assigned_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_unique_direct_custom_design_idx" ON "cart_items" USING btree ("uploaded_design_id") WHERE "cart_items"."uploaded_design_id" is not null and "cart_items"."item_type" = 'custom_design';--> statement-breakpoint
CREATE INDEX "orders_order_type_idx" ON "orders" USING btree ("order_type");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_status_check" CHECK ("users"."account_status" in ('active', 'invited', 'pending'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_status_check" CHECK ("users"."role_status" in ('unassigned', 'assigned'));