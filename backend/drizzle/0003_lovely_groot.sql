CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subsections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subsections" ADD CONSTRAINT "subsections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sections_name_unique" ON "sections" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sections_visible_idx" ON "sections" USING btree ("is_visible");--> statement-breakpoint
CREATE UNIQUE INDEX "subsections_section_name_unique" ON "subsections" USING btree ("section_id","name");--> statement-breakpoint
CREATE INDEX "subsections_visible_idx" ON "subsections" USING btree ("is_visible");