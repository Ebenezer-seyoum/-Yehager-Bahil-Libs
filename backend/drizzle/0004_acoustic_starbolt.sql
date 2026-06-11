DROP TABLE "sections" CASCADE;--> statement-breakpoint
DROP TABLE "subsections" CASCADE;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "color" varchar(50);--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "icon" varchar(50);