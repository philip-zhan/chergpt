"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chatv2",
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
