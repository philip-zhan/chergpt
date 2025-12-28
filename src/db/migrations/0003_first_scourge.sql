ALTER TABLE "chat" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "chat" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "document" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "document" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "message" RENAME COLUMN "chatId" TO "chat_id";--> statement-breakpoint
ALTER TABLE "message" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "message" RENAME COLUMN "inputTokenDetails" TO "input_token_details";--> statement-breakpoint
ALTER TABLE "message" RENAME COLUMN "outputTokenDetails" TO "output_token_details";--> statement-breakpoint
ALTER TABLE "message" RENAME COLUMN "totalTokens" TO "total_tokens";--> statement-breakpoint
ALTER TABLE "stream" RENAME COLUMN "chatId" TO "chat_id";--> statement-breakpoint
ALTER TABLE "stream" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "documentId" TO "document_id";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "documentCreatedAt" TO "document_created_at";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "originalText" TO "original_text";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "suggestedText" TO "suggested_text";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "isResolved" TO "is_resolved";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "suggestion" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "vote" RENAME COLUMN "chatId" TO "chat_id";--> statement-breakpoint
ALTER TABLE "vote" RENAME COLUMN "messageId" TO "message_id";--> statement-breakpoint
ALTER TABLE "vote" RENAME COLUMN "isUpvoted" TO "is_upvoted";--> statement-breakpoint
ALTER TABLE "chat" DROP CONSTRAINT "chat_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "document" DROP CONSTRAINT "document_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "message" DROP CONSTRAINT "message_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "stream" DROP CONSTRAINT "stream_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "suggestion" DROP CONSTRAINT "suggestion_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "suggestion" DROP CONSTRAINT "suggestion_documentId_documentCreatedAt_document_id_createdAt_fk";
--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_messageId_message_id_fk";
--> statement-breakpoint
ALTER TABLE "document" DROP CONSTRAINT "document_id_createdAt_pk";--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_chatId_messageId_pk";--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_id_created_at_pk" PRIMARY KEY("id","created_at");--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_chat_id_message_id_pk" PRIMARY KEY("chat_id","message_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stream" ADD CONSTRAINT "stream_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_document_id_document_created_at_document_id_created_at_fk" FOREIGN KEY ("document_id","document_created_at") REFERENCES "public"."document"("id","created_at") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote" ADD CONSTRAINT "vote_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote" ADD CONSTRAINT "vote_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
