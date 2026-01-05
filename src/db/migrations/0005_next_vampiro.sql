CREATE TABLE IF NOT EXISTS "chatv2" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chatv2_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"user_id" integer NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	CONSTRAINT "chatv2_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messagev2" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messagev2_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"chat_id" integer NOT NULL,
	"role" text NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"created_at" timestamp NOT NULL,
	"input_token_details" json,
	"output_token_details" json,
	"total_tokens" integer,
	CONSTRAINT "messagev2_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatv2" ADD CONSTRAINT "chatv2_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messagev2" ADD CONSTRAINT "messagev2_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
