"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chatv2",
    }),
  });
  const [input, setInput] = useState("");

  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, index) =>
            part.type === "text" ? <span key={index}>{part.text}</span> : null
          )}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          disabled={status !== "ready"}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          value={input}
        />
        <button disabled={status !== "ready"} type="submit">
          Submit
        </button>
      </form>
    </>
  );
}
