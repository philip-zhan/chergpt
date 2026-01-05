"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
}

export function Chat({ id, initialMessages }: ChatProps) {
  const router = useRouter();
  const { messages, sendMessage, status } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chatv2",
      // only send the last message
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
          },
        };
      },
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask me anything and I'll help you out."
              title="Start a conversation"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part) =>
                      message.role === "assistant" ? (
                        <MessageResponse key={part.text}>
                          {part.text}
                        </MessageResponse>
                      ) : (
                        <span key={part.text}>{part.text}</span>
                      )
                    )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "streaming" && messages.at(-1)?.role !== "assistant" && (
            <Message from="assistant">
              <MessageContent>
                <Loader size={16} />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim()) {
              sendMessage({ text });
              setInput("");
              router.replace(`/new/${id}`);
            }
          }}
        >
          <PromptInputTextarea
            disabled={status !== "ready"}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            value={input}
          />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              disabled={status !== "ready" || !input.trim()}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
