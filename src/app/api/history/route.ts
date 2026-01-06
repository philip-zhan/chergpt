import type { NextRequest } from "next/server";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/db/queries/chatv2";
import { getUserId } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }
  const userId = await getUserId();
  const chats = await getChatsByUserId({
    userId,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}

export async function DELETE() {
  const userId = await getUserId();
  const result = await deleteAllChatsByUserId({ userId });

  return Response.json(result, { status: 200 });
}
