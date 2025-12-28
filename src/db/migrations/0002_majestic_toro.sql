ALTER TABLE "message" ADD COLUMN "inputTokenDetails" json;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "outputTokenDetails" json;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "totalTokens" integer;