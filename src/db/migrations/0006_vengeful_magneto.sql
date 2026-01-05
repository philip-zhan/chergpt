DO $$ BEGIN
 CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "messagev2" DROP CONSTRAINT "messagev2_chat_id_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "messagev2" ALTER COLUMN "role" SET DATA TYPE message_role;--> statement-breakpoint
ALTER TABLE "messagev2" ADD COLUMN "model_name" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messagev2" ADD CONSTRAINT "messagev2_chat_id_chatv2_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chatv2"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
