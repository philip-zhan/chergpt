CREATE TABLE IF NOT EXISTS "connection" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "connection_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"scope" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connection" ADD CONSTRAINT "connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connection_userId_idx" ON "connection" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "connection_userId_provider_uidx" ON "connection" USING btree ("user_id","provider");