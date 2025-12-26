# Chat Flow Architecture

A concise guide to understanding how chat messages flow from user input to AI response in CherGPT.

## Overview

The application uses **Vercel AI SDK** with **streaming responses** over Server-Sent Events (SSE). Messages flow through React components, Next.js API routes, to AI Gateway, and back as real-time streams.

**Key Stack**: React + Next.js + Vercel AI SDK + Drizzle ORM + AI Gateway

## High-Level Flow

```
User Input (MultimodalInput)
    ↓
useChat Hook (manages state & streaming)
    ↓
POST /api/chat (with message + context)
    ↓
API Route Handler
  • Authenticate user
  • Load/create chat
  • Save user message to DB
    ↓
createUIMessageStream
  • Call AI model via Gateway
  • Stream response chunks
    ↓
SSE Stream (JSON → SSE format)
    ↓
Frontend receives & processes stream
  • Update messages in real-time
  • Handle data events (title, artifacts)
    ↓
onFinish callbacks
  • Save to database
  • Update UI state
    ↓
User sees complete response
```

## Key Components

### 1. Page Component (`app/(chat)/page.tsx`)
Entry point that generates a chat ID, reads model preference from cookies, and initializes the Chat component.

### 2. Chat Component (`components/chat.tsx`)
The main orchestrator using the `useChat()` hook from Vercel AI SDK. Manages:
- Message state and streaming status
- Tool approval auto-continuation
- Request payload customization via transport
- Browser navigation handling

### 3. MultimodalInput (`components/multimodal-input.tsx`)
User input interface with:
- Text input with auto-resize
- File uploads (drag/drop/paste)
- Model selector
- Message construction (text + file parts)

### 4. API Route (`app/api/chat/route.ts`)
Backend handler that:
- Authenticates and authorizes users
- Loads/creates chats in database
- Calls AI model via `streamText()` and AI Gateway
- Generates chat titles in parallel (non-blocking)
- Returns SSE stream with resumability support (Redis)

### 5. DataStreamHandler (`components/data-stream-handler.tsx`)
Side-effect processor that handles custom data events like chat titles and artifact updates.

## Message Flow Details

### Standard Chat Flow

1. **User Input** → MultimodalInput captures text and files
2. **Submit** → `sendMessage()` constructs message with text + file parts
3. **Transport** → Sends POST to `/api/chat` with last message + metadata
4. **API Handler** → Authenticates, saves to DB, creates stream
5. **AI Processing** → `streamText()` calls model via AI Gateway
6. **Streaming Back** → Response chunks converted to SSE format
7. **Frontend Updates** → `useChat` updates messages in real-time
8. **Completion** → Both client and server `onFinish` callbacks trigger
   - Server: Save assistant message to DB
   - Client: Mutate SWR cache, update UI

### File Upload Flow

1. User selects/pastes file → Upload to `/api/files/upload`
2. Returns URL and metadata → Stored in attachments state
3. On submit → Files included as "file" parts in message
4. Backend → Files passed to model for analysis

## Database Operations

Uses **Drizzle ORM** with four main tables:

- **chat** - Chat metadata (id, userId, title, visibility)
- **message** - Messages with JSONB parts (text, files, tools)
- **stream** - Stream state for resumability (Redis-backed)
- **vote** - User votes on messages

**Key Operations:**
- New chat → Insert chat with placeholder title
- User message → Insert immediately
- Stream completion → Insert/update assistant messages
- Tool approval → Update message parts with new state

## Error Handling

Custom `ChatSDKError` class provides structured error responses:

- `bad_request:api` - Invalid request format
- `unauthorized:chat` - Not authenticated
- `forbidden:chat` - Not authorized for this chat
- `bad_request:activate_gateway` - AI Gateway requires credit card
- `offline:chat` - Network or server error

Errors are caught by `useChat` hook's `onError` callback and displayed via toast notifications.

## Tool Approval Flow

Some tools (e.g., document creation) require user approval before execution:

1. **AI requests tool** → Message part has `state: "approval-required"`
2. **UI shows approval prompt** → User approves/denies
3. **State update** → Part updated with `state: "approval-responded"` and approval result
4. **Auto-continue** → If approved, `sendAutomaticallyWhen` returns true
5. **Full context sent** → ALL messages sent (not just last) so AI sees tool approval
6. **Execution** → Backend processes with tool state, AI executes tool
7. **Persist** → Update existing message parts + save new response

**Key difference**: Tool approval flow sends entire message history, while normal flow only sends the last message.

## Performance Optimizations

1. **Parallel Title Generation** - Title generated in background, doesn't block stream
2. **Message Throttling** - Updates batched every 100ms to reduce re-renders
3. **Resumable Streams** - Redis-backed stream state allows reconnection without data loss
4. **Conditional DB Queries** - Skip loading messages for tool approval flow
5. **Component Memoization** - Expensive components like MultimodalInput use custom comparison
6. **SWR Caching** - Smart cache invalidation for chat history and votes

## State Management

- **Local State** (useState) - Input text, attachments, selected model
- **Server State** (SWR) - Chat history, votes, message counts
- **Stream State** (useChat) - Messages, status, errors
- **Global State** (Zustand) - Artifacts, data stream events

## Security

- Authentication/authorization on every API call
- Chat ownership verification
- Zod schema validation
- Rate limiting per user
- Private/public visibility control

---

*Last Updated: December 2025*

