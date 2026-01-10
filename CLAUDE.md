# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
pnpm install          # Install dependencies
pnpm db:migrate       # Run database migrations
pnpm dev              # Start development server (localhost:3000)
```

## Essential Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm build:prod       # Run migrations + build (deployment)

# Database
pnpm db:migrate       # Run database migrations
pnpm db:generate      # Generate migrations from schema changes
pnpm db:studio        # Open Drizzle Studio for database inspection
pnpm db:push          # Push schema directly (dev only, skip migrations)

# Code Quality
pnpm lint             # Check code with Ultracite (Biome-based linter)
pnpm format           # Fix linting/formatting issues

# Testing
pnpm test             # Run Playwright E2E tests
```

## Project Overview

**CherGPT** is a Next.js 16 AI chatbot application built with:
- **Framework**: Next.js 16 (App Router) + React 19
- **AI**: Vercel AI SDK v6 with AI Gateway
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: better-auth with Google OAuth
- **UI**: shadcn/ui + Tailwind CSS v4 + Radix UI
- **Testing**: Playwright
- **Linting**: Ultracite (Biome preset for Next.js)

## Architecture

### Directory Structure

```
/home/user/chergpt/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (authed)/          # Protected routes (chat, settings)
│   │   │   ├── chat/          # Chat interface
│   │   │   ├── settings/      # User settings
│   │   │   └── layout.tsx     # Auth layout wrapper
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Legacy chat endpoint
│   │   │   ├── chatv2/        # New simplified chat endpoint
│   │   │   ├── document/      # Document/artifact management
│   │   │   ├── history/       # Chat history
│   │   │   ├── files/         # File uploads
│   │   │   ├── connections/   # OAuth integrations
│   │   │   └── auth/          # better-auth handler
│   │   └── auth/              # Authentication pages
│   ├── components/            # React components
│   │   ├── chat/              # Chat UI (Chat, ChatV2, Messages)
│   │   ├── ai-elements/       # Reusable AI components
│   │   ├── ui/                # shadcn/ui primitives
│   │   └── providers/         # React context providers
│   ├── db/                    # Database layer
│   │   ├── schemas/           # Drizzle table schemas
│   │   ├── queries/           # Database query functions
│   │   ├── migrations/        # SQL migration files
│   │   └── index.ts           # DB client + connection
│   ├── lib/                   # Utilities and shared logic
│   │   ├── ai/               # AI configuration
│   │   │   ├── providers.ts  # Model provider setup
│   │   │   ├── models.ts     # Available models
│   │   │   ├── prompts.ts    # System prompts
│   │   │   └── tools/        # AI tools (createDocument, etc.)
│   │   ├── auth/             # better-auth configuration
│   │   ├── connections/      # OAuth integrations (Google, Slack)
│   │   └── utils.ts          # Utility functions
│   ├── artifacts/             # Document/artifact system
│   │   ├── code/             # Code execution artifacts
│   │   ├── text/             # Text editor artifacts
│   │   ├── sheet/            # Spreadsheet artifacts
│   │   └── image/            # Image artifacts (planned)
│   ├── hooks/                 # Custom React hooks
│   └── tests/                 # Playwright E2E tests
│       ├── e2e/              # Test files
│       ├── pages/            # Page object models
│       └── prompts/          # Test prompts
├── docs/                      # Documentation
├── .github/workflows/         # CI/CD (Playwright tests)
└── public/                    # Static assets
```

### Data Flow

1. **Chat Flow**:
   - User input → `/api/chat` or `/api/chatv2`
   - `streamText()` from AI SDK streams responses
   - Messages saved to database (message/messagev2 tables)
   - Real-time updates via SSE (Server-Sent Events)

2. **Authentication**:
   - better-auth manages sessions
   - Email/password + Google OAuth
   - Session checks on protected routes
   - Organizations and teams support

3. **State Management**:
   - **Local state**: useState for input, attachments
   - **Server state**: SWR for chat history, votes
   - **Streaming**: useChat hook for messages
   - **Artifacts**: SWR with custom hooks + auto-save

4. **Artifact System**:
   - Tools create/update documents via AI
   - Stored in `document` table with versioning
   - Full-screen overlay with split view
   - Auto-save with 2s debounce

## Database Layer

### Key Tables

**chatv2** (primary) / **chat** (legacy):
- Integer ID + public nanoid
- Fields: userId, title, visibility (public/private)
- Indexes on userId and publicId

**messagev2** (primary) / **message** (legacy):
- JSONB `parts` array: text, file, tool parts
- JSONB `attachments` for uploaded files
- Token tracking: inputTokens, outputTokens, totalTokens
- Supports AI SDK streaming format

**document**:
- Artifact storage (text, code, sheet, image)
- Composite PK: (id, createdAt) for versioning
- Fields: title, kind, content (JSONB)

**user** (better-auth):
- Email/password authentication
- Google OAuth support
- Ban system: banned, banReason, banExpires
- Organization/team associations

**connection**:
- OAuth integrations (Google, Slack)
- Encrypted tokens (AES-256-GCM)
- Auto-refresh tracking
- Status: active, revoked, error

**vote**:
- Message upvote/downvote tracking
- One vote per user per message

**suggestion**:
- Document editing suggestions
- Tracks documentId, userId, originalText, suggestedText

**stream** (Redis-backed):
- Resumable stream state
- Production-only feature

### Database Conventions

1. **Naming**:
   - Singular table names (chat, not chats)
   - snake_case for columns
   - Integer primary keys
   - nanoid for external-facing IDs

2. **Query Organization**:
   - All queries in `src/db/queries/`
   - One file per table (e.g., `chat-queries.ts`)
   - Server-only imports (`"use server"` or `"server-only"`)
   - Type-safe with Drizzle query builder

3. **Migrations**:
   - Generate: `pnpm db:generate`
   - Apply: `pnpm db:migrate`
   - Never edit schema without generating migration
   - Migrations run automatically in production builds

4. **Common Patterns**:
   ```typescript
   // On-conflict for idempotent saves
   await db.insert(table).values(data).onConflictDoUpdate(...)

   // Composite keys for versioning
   const [doc] = await db.select().from(document)
     .where(and(eq(document.id, id), eq(document.createdAt, version)))

   // Server-only queries
   "use server"
   export async function getChatById(id: string) { ... }
   ```

## API Routes

### `/api/chat` (Legacy)
**POST**: Stream chat responses
- Supports tool approval workflow
- Resumable streams via Redis
- Parallel title generation
- Max duration: 60s
- Custom error handling with ChatSDKError

**DELETE**: Delete chat by ID
- Ownership verification
- Cascading delete (messages, documents)

### `/api/chatv2` (New)
**POST**: Simplified streaming chat
- Uses `toUIMessageStreamResponse()` helper
- Auto-save messages to database
- Max duration: 30s

**PATCH**: Update chat visibility
- Toggle public/private
- Ownership verification

### `/api/history`
**GET**: Paginated chat list
- Cursor-based pagination
- Filters by userId
- Returns: chats with message counts

**DELETE**: Delete all user chats
- Ownership verification
- Soft delete or hard delete

### `/api/document`
**GET**: Fetch document by ID
- Optional version parameter
- Returns document with metadata

**POST**: Save new document version
- Validates ownership
- Auto-generates version timestamp

### `/api/files/upload`
**POST**: Upload files to Vercel Blob
- Multipart form data
- Returns URL + metadata

### `/api/connections/*`
OAuth integration endpoints:
- `/api/connections/google/init` - Start Google OAuth
- `/api/connections/google/callback` - Handle OAuth callback
- Same pattern for Slack

### API Conventions

1. **Use API routes, not Server Actions** for mutations
2. **Validate inputs** with Zod schemas
3. **Check authentication** on all protected routes
4. **Return structured errors** using ChatSDKError
5. **Set max duration** for streaming routes

Example API route structure:
```typescript
// src/app/api/example/route.ts
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ ... })

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  // ... implementation

  return NextResponse.json({ ... })
}
```

## AI Integration

### Provider Configuration

Models accessed via **Vercel AI Gateway** (`@ai-sdk/gateway`):

```typescript
// Standard models
gateway.languageModel(modelId)

// Reasoning models (extract <thinking> tags)
wrapLanguageModel({
  model: gateway.languageModel(modelId),
  middleware: extractReasoningMiddleware({ tagName: "thinking" })
})

// Test environment
customProvider({ languageModels: { ... } })
```

### Available Models

Located in `src/lib/ai/models.ts`:
- **OpenAI**: gpt-5.2, gpt-5-mini
- **Anthropic**: claude-opus-4.5, claude-sonnet-4.5, claude-haiku-4.5
- **Google**: gemini-3-pro, gemini-3-flash
- **Default**: openai/gpt-5.2-chat-latest

### AI Tools

Tools in `src/lib/ai/tools/`:

**createDocument**: Generate artifacts
- Types: text, code, sheet, image
- Streams structured data with `streamObject()`
- Auto-saves to database

**updateDocument**: Modify existing artifacts
- Applies diffs/changes
- Creates new version

**requestSuggestions**: Suggest edits
- Generates proposed changes
- User approval workflow

**getWeather**: Demo tool
- Example external API integration

### System Prompts

Located in `src/lib/ai/prompts.ts`:
- Main system prompt with artifacts instructions
- Geographic hints from Vercel geolocation
- Reasoning models: no tools, chat only
- Model-specific prompts (code, sheet, title)

### Streaming Architecture

```typescript
// Chat streaming
const result = streamText({
  model: getModel(modelId),
  system: systemPrompt,
  messages,
  tools,
  maxSteps: 5,
  onFinish: async (event) => {
    // Save to database
  }
})

// Return to client
return result.toDataStreamResponse()

// Client-side consumption
const { messages, append } = useChat({
  api: "/api/chat"
})
```

## Component Architecture

### UI Framework

**shadcn/ui** components based on:
- Radix UI primitives
- Tailwind CSS v4
- TypeScript + React 19

### Key Chat Components

**Chat / ChatV2** (`src/components/chat/`):
- Main orchestrator using `useChat()` hook
- Manages streaming, tool approval, attachments
- Custom transport for request customization

**MultimodalInput**:
- Auto-resize textarea
- File upload (drag/drop/paste)
- Model selector integration
- Message parts construction

**Messages**:
- Renders message list
- Syntax highlighting (Shiki)
- Tool call/result display
- Vote buttons, copy actions

**Artifact** (`src/components/artifact/`):
- Full-screen overlay with animations
- Split view (chat + document)
- Version history with diff mode
- Auto-save with debouncing (2s)
- Framer Motion transitions

**MessageActions**:
- Copy, regenerate, vote, edit
- Tool approval prompts
- Context-aware visibility

### AI Elements (Reusable)

Located in `src/components/ai-elements/`:
- `Conversation`: Container for messages
- `Message`: Individual message rendering
- `PromptInput`: Input with suggestions
- `Reasoning`: Collapsible thinking display
- `Loader`: Streaming indicator

### Artifact Types

**Text** (`src/artifacts/text/`):
- ProseMirror editor
- Markdown support
- Rich text formatting

**Code** (`src/artifacts/code/`):
- CodeMirror editor
- Syntax highlighting
- Pyodide Python execution in browser
- Sandboxed runtime

**Sheet** (`src/artifacts/sheet/`):
- react-data-grid spreadsheet
- Cell editing
- Formula support (planned)

**Image** (`src/artifacts/image/`):
- Image generation (planned)
- Display and editing

### Component Patterns

1. **Server vs Client Components**:
   - Server: Read operations, initial data fetching
   - Client: Interactivity, forms, streaming

2. **Memoization**:
   - Use React.memo with custom equality checks
   - Prevent unnecessary re-renders during streaming

3. **State Management**:
   - Local: useState, useReducer
   - Server: SWR for caching
   - Forms: Controlled inputs

4. **API Requests**:
   - Use fetch in client components
   - React Query for mutations
   - SWR for queries with revalidation

5. **File Uploads**:
   - Convert to base64 for message parts
   - Upload to Blob for large files
   - Store URLs in attachments

## Testing

### Framework: Playwright

**Configuration** (`playwright.config.ts`):
- Test directory: `./tests`
- Parallel execution: 2 workers
- Timeout: 240s per test
- Base URL: `http://localhost:3000`
- Auto-start dev server before tests

**Test Structure**:
```
src/tests/
├── e2e/
│   ├── api.test.ts           # API route tests
│   ├── auth.test.ts          # Authentication flows
│   ├── chat.test.ts          # Chat functionality
│   └── model-selector.test.ts # UI component tests
├── pages/                     # Page object models
└── prompts/                   # Test prompts
```

**Test Environment**:
- Mock AI models via `PLAYWRIGHT` env var
- Guest user generation for auth tests
- Isolated test database
- HTML reporter with trace on failure

**Running Tests**:
```bash
pnpm test                     # Run all tests
pnpm test -- --headed         # Run with browser visible
pnpm test -- --debug          # Debug mode
```

**CI/CD**:
- GitHub Actions workflow (`.github/workflows/playwright.yml`)
- Manual trigger only (workflow_dispatch)
- Caches pnpm store and browsers
- Uploads reports on failure

## Code Conventions

### TypeScript

- **Strict mode** enabled
- Path alias: `@/*` → `./src/*`
- No explicit `any` (use `unknown` + type guards)
- Prefer type inference over explicit types

### Database

- Singular table names
- snake_case for columns
- Integer primary keys
- nanoid for external-facing IDs
- Schemas in `src/db/schemas/`
- Queries in `src/db/queries/`
- Server-only imports

### Next.js

- **Server Components** for read operations
- **API routes** for write operations (not Server Actions)
- **Client Components** for interactivity
- File-based routing (App Router)
- Route handlers in `route.ts` files

### React

- Functional components with hooks
- Memoization for expensive renders
- Custom hooks in `src/hooks/`
- Context providers in `src/components/providers/`

### Styling

- **Tailwind CSS v4** for utility classes
- shadcn/ui components (customizable)
- CSS modules for complex layouts
- Responsive design (mobile-first)

### Linting

**Ultracite** (Biome preset for Next.js):
```bash
pnpm lint                     # Check code
pnpm format                   # Fix issues automatically
```

**Rules**:
- No console.log (use debugging tools)
- No unused variables
- Consistent formatting (tabs, spacing)
- Sorted imports

**Exclusions**:
- UI components (auto-generated)
- Migrations (SQL)
- Utility functions (some flexibility)

**Pre-commit**: Always run `pnpm format` before committing

## Security

### Authentication

- better-auth session-based (no JWT)
- Per-route authentication checks
- Ownership verification on mutations
- Google OAuth social login

### Authorization

- User-resource ownership checks
- Public/private visibility control
- Ban system for users
- Organization/team permissions

### Data Protection

- OAuth token encryption (AES-256-GCM)
- Environment variables for secrets
- No sensitive data in logs
- CSRF protection via better-auth

### Input Validation

- Zod schemas on all API inputs
- SQL injection prevention (Drizzle parameterized queries)
- XSS prevention (React escaping)
- File upload validation

### Rate Limiting

- Planned via apikey table
- Per-user request tracking
- Token usage limits

## Performance

### Optimizations

1. **Streaming**:
   - Server-Sent Events (SSE) for chat
   - Resumable streams via Redis
   - Message throttling (100ms batches)

2. **Caching**:
   - SWR with smart revalidation
   - React Compiler enabled
   - Component memoization

3. **Build**:
   - Turbopack for faster dev builds
   - React Compiler for optimization
   - Dynamic imports for code splitting

4. **Database**:
   - Indexes on frequently queried columns
   - Conditional queries (only fetch needed data)
   - Connection pooling

5. **Frontend**:
   - Smooth streaming with word chunking
   - Debounced auto-save (2s)
   - Lazy loading for artifacts

## Environment Variables

Required variables (see `.env.example`):

```bash
# Database
POSTGRES_URL=postgresql://user:pass@host:5432/db

# Authentication
AUTH_SECRET=                  # Random 32-byte secret
GOOGLE_CLIENT_ID=             # Google OAuth
GOOGLE_CLIENT_SECRET=

# Storage
BLOB_READ_WRITE_TOKEN=        # Vercel Blob

# AI
AI_GATEWAY_API_KEY=           # For non-Vercel deployments (optional)

# Redis (optional, for resumable streams)
REDIS_URL=

# Encryption
ENCRYPTION_KEY=               # For OAuth token encryption

# App
NEXT_PUBLIC_APP_URL=          # e.g., https://chergpt.com
```

## Common Workflows

### Adding a New Database Table

1. **Create schema** in `src/db/schemas/`:
   ```typescript
   // new-table-schema.ts
   export const newTable = pgTable("new_table", {
     id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
     name: text("name").notNull(),
     createdAt: timestamp("created_at").defaultNow().notNull()
   })
   ```

2. **Export from index**:
   ```typescript
   // src/db/schemas/index.ts
   export * from "./new-table-schema"
   ```

3. **Generate migration**:
   ```bash
   pnpm db:generate
   ```

4. **Review migration** in `src/db/migrations/`

5. **Apply migration**:
   ```bash
   pnpm db:migrate
   ```

6. **Create query file** in `src/db/queries/`:
   ```typescript
   // new-table-queries.ts
   "use server"
   export async function getNewTableById(id: number) { ... }
   ```

### Adding a New API Route

1. **Create route file**:
   ```typescript
   // src/app/api/example/route.ts
   import { auth } from "@/lib/auth"
   import { NextRequest, NextResponse } from "next/server"

   export async function POST(req: NextRequest) {
     const session = await auth.api.getSession({ headers: req.headers })
     if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

     // Implementation
     return NextResponse.json({ ... })
   }
   ```

2. **Add validation** with Zod

3. **Test** with Playwright or manually

### Adding a New AI Tool

1. **Create tool file**:
   ```typescript
   // src/lib/ai/tools/my-tool.ts
   import { tool } from "ai"
   import { z } from "zod"

   export const myTool = tool({
     description: "...",
     parameters: z.object({ ... }),
     execute: async (params) => { ... }
   })
   ```

2. **Export from index**:
   ```typescript
   // src/lib/ai/tools/index.ts
   export { myTool } from "./my-tool"
   ```

3. **Add to chat API**:
   ```typescript
   // src/app/api/chat/route.ts
   tools: { myTool, ... }
   ```

### Adding a New Component

1. **Create component file**:
   ```typescript
   // src/components/my-component.tsx
   "use client" // if interactive

   export function MyComponent({ prop }: Props) {
     return <div>...</div>
   }
   ```

2. **Use shadcn/ui** for UI primitives:
   ```bash
   pnpm dlx shadcn@latest add button
   ```

3. **Test** in Storybook or browser

## Troubleshooting

### Database Issues

**Problem**: Migration fails
- **Solution**: Check migration SQL, revert with `pnpm db:rollback`, fix, regenerate

**Problem**: Query returns no results
- **Solution**: Check indexes, verify data exists, use `pnpm db:studio` to inspect

### Build Issues

**Problem**: Type errors on build
- **Solution**: Run `pnpm lint` and `pnpm format`, fix TypeScript errors

**Problem**: Build timeout
- **Solution**: Increase max duration, check for slow queries

### Authentication Issues

**Problem**: Session not persisting
- **Solution**: Check AUTH_SECRET is set, cookies enabled, domain matches

**Problem**: OAuth callback fails
- **Solution**: Verify redirect URI matches in Google Console, check client ID/secret

### AI Streaming Issues

**Problem**: Messages not streaming
- **Solution**: Check SSE headers, verify `streamText()` usage, test with curl

**Problem**: Tools not executing
- **Solution**: Check tool definition, verify maxSteps > 1, inspect logs

## Advanced Topics

### Dual Chat Systems

Two chat systems exist:
- **Legacy**: `/api/chat` with complex tool approval
- **New**: `/api/chatv2` with simplified SDK usage
- Migration in progress, both maintained

### Resumable Streams

- Redis-backed stream state
- Automatic reconnection on network failure
- Production-only feature
- Fallback to standard SSE

### Token Encryption

- AES-256-GCM for OAuth tokens
- Automatic token refresh
- Expiry tracking with 5-min buffer
- Provider-specific refresh logic

### Artifact Plugin System

- `DocumentHandler` interface
- Client/server separation
- Streaming generation with deltas
- Automatic versioning

### Code Execution

- Pyodide for Python in browser
- Sandboxed execution (no file system)
- Loaded via CDN (v0.23.4)
- stdout/stderr capture

## Resources

### Documentation

- `/docs/chat-flow.md` - Detailed architecture guide
- `/docs/google-oauth-setup.md` - Google OAuth setup
- `/docs/slack-oauth-setup.md` - Slack OAuth setup
- `README.md` - General project info

### External Links

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [better-auth](https://better-auth.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Playwright](https://playwright.dev)

## Key Takeaways

1. **Use API routes, not Server Actions** for mutations
2. **Database operations** go through dedicated query functions in `/db/queries/`
3. **Always generate migrations** before modifying schemas
4. **Run `pnpm format`** before committing
5. **Authenticate all protected routes** with better-auth
6. **AI calls go through AI Gateway**, not direct provider SDKs
7. **Streaming uses Vercel AI SDK** patterns (`streamText`, `useChat`)
8. **Two chat systems exist** (legacy `/api/chat` and new `/api/chatv2`)
9. **Components follow shadcn/ui** patterns with Radix primitives
10. **Test with Playwright** E2E tests before deploying

## Plan Mode

When using Claude Code's plan mode, export plans to `.cursor/plans/` directory for tracking.

---

This codebase demonstrates modern Next.js patterns with sophisticated AI streaming, real-time collaboration, and a plugin-based artifact system. Always prioritize simplicity, type safety, and user experience.
