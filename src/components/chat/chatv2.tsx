"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
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
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { ChatHeader } from "@/components/chat/chat-header";
import { ModelSelectorCompact } from "@/components/chat/model-selector";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
  initialChatModel?: string;
}

export function Chat({
  id,
  initialMessages,
  initialChatModel = DEFAULT_CHAT_MODEL,
}: ChatProps) {
  const [selectedChatModel, setSelectedChatModel] = useState(initialChatModel);

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
            selectedChatModel,
          },
        };
      },
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        chatId={id}
        isReadonly={false}
        selectedVisibilityType="private"
      />
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask me anything and I'll help you out."
              title="Start a conversation"
            />
          ) : (
            messages.map((message, messageIndex) => {
              const reasoningParts = message.parts.filter(
                (part) => part.type === "reasoning"
              );
              const textParts = message.parts.filter(
                (part) => part.type === "text"
              );
              const isLastMessage = messageIndex === messages.length - 1;
              const isStreaming =
                status === "streaming" &&
                isLastMessage &&
                message.role === "assistant";

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {reasoningParts.length > 0 && (
                      <Reasoning
                        defaultOpen
                        isStreaming={isStreaming && textParts.length === 0}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>
                          {reasoningParts.map((part) => part.text).join("")}
                        </ReasoningContent>
                      </Reasoning>
                    )}
                    {textParts.map((part) =>
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
              );
            })
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
              // Update URL without unmounting the component to preserve the streaming connection
              window.history.replaceState(null, "", `/new/${id}`);
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
            <PromptInputTools>
              <ModelSelectorCompact
                onModelChange={setSelectedChatModel}
                selectedModelId={selectedChatModel}
              />
            </PromptInputTools>
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
