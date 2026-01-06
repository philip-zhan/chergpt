# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan mode
After creating a plan, export the plan to a file in the `.cursor/plans` directory.

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Check code with ultracite (biome-based linter)
pnpm format           # Fix linting/formatting issues
pnpm db:migrate       # Run database migrations
pnpm db:generate      # Generate migrations from schema changes
pnpm db:studio        # Open Drizzle Studio for database inspection
pnpm test             # Run Playwright tests
```

## Architecture

This is a Next.js 16 AI chatbot application using the Vercel AI SDK.

### Key Directories

- `src/app/` - Next.js App Router pages and API routes
  - `(authed)/` - Protected routes requiring authentication
  - `api/` - API routes for chat, history, documents, etc.
- `src/components/` - React components (shadcn/ui based)
- `src/db/` - Database layer using Drizzle ORM with Postgres
  - `schemas/` - Table definitions
  - `queries/` - Database query functions
  - `migrations/` - SQL migration files
- `src/lib/ai/` - AI configuration (providers, models, prompts, tools)
- `src/hooks/` - Custom React hooks
- `src/artifacts/` - Document/artifact rendering system

### Data Flow

- Chat messages stream through `/api/chat` using the AI SDK's `streamText`
- Authentication via better-auth with Google OAuth support
- State management uses SWR for caching and React Query for API requests
- Resumable streams supported via Redis for production deployments

### AI Configuration

Models are accessed through Vercel AI Gateway (`@ai-sdk/gateway`). The provider setup in `src/lib/ai/providers.ts` handles:
- Standard models via `gateway.languageModel(modelId)`
- Reasoning models with thinking extraction middleware
- Mock models for testing via `models.mock.ts`

## Code Conventions

### Database
- Singular table names, snake_case for columns
- Integer primary keys, nanoid for external-facing IDs
- Schemas in `src/db/schemas/`, queries in `src/db/queries/`

### Next.js Patterns
- Server Components for read operations
- API routes for write operations (not server actions)
- React Query for client-side API requests

### Linting
Uses Ultracite (Biome preset). Run `pnpm format` before committing.
