"use server";

import { getSuggestionsByDocumentId } from "@/db/queries/suggestion";

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}
