# Outline CLI PRD (MVP)

## Goal

Build a simple, agent-friendly CLI for [Outline](https://github.com/outline/outline) that supports page (document) CRUD and related lifecycle operations using Outline's RPC-style API.

## Context

Outline "pages" are API `documents`. The API uses RPC-style `POST` endpoints under `/api`, for example:

- `POST /api/documents.create`
- `POST /api/documents.info`
- `POST /api/documents.update`

## MVP Scope

### Commands

- `outline page get <id-or-urlId>`
- `outline page list [filters]`
- `outline page create [--title] [--text|--file|--stdin] (--collection-id|--parent-id) [--publish]`
- `outline page update <id> [fields]`
- `outline page append <id> --text|--file|--stdin`
- `outline page prepend <id> --text|--file|--stdin`
- `outline page move <id> (--collection-id|--parent-id) [--index]`
- `outline page archive <id>`
- `outline page delete <id> [--permanent]`
- `outline page restore <id> [--collection-id] [--revision-id]`
- `outline page search --query ...`
- `outline page find --query ...` (title-only search)

### Agent-focused UX requirements

- `--json` output for every command
- Stable exit codes for auth/not found/validation/rate-limit errors
- `--stdin` support for content updates
- Optional update guard: `--if-updated-at <timestamp>` to reduce overwrite races

## API Mapping

- `page get` -> `documents.info`
- `page list` -> `documents.list`
- `page create` -> `documents.create`
- `page update/append/prepend` -> `documents.update`
- `page move` -> `documents.move`
- `page archive` -> `documents.archive`
- `page delete` -> `documents.delete`
- `page restore` -> `documents.restore`
- `page search` -> `documents.search`
- `page find` -> `documents.search_titles`

## Important Outline lifecycle semantics

- `documents.archive` archives a document (recoverable).
- `documents.delete` moves a document to trash (soft-delete by default).
- `documents.delete` with `permanent=true` irreversibly deletes the document.
- `documents.restore` restores archived/deleted docs or can restore to a prior revision.

## Recommended Implementation

### Language

TypeScript (Node 20+) for fast iteration, strong typing, and alignment with Outline's TypeScript API ecosystem.

### Structure

- `src/cli.ts` (entrypoint)
- `src/core/*` (config, RPC client, args parser, output, errors)
- `src/commands/page/*` (command handlers)
- `src/types/outline.ts` (minimal typed response shapes)

## Phased Delivery

1. Scaffold CLI + config + HTTP client + core page CRUD commands
2. Add agent ergonomics (append/prepend wrappers, guarded updates, stdin/file flows)
3. Add retries, profiles, packaging, tests

## Sources used

- Outline OpenAPI spec (`outline/openapi`)
- Outline server routes: `server/routes/api/documents/documents.ts`
- Outline server schemas: `server/routes/api/documents/schema.ts`

