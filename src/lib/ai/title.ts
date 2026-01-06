import { generateText, type UIMessage } from "ai";
import { getTextFromMessage } from "../utils";
import { titlePrompt } from "./prompts";
import { getTitleModel } from "./providers";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: getTextFromMessage(message),
  });

  return title;
}
