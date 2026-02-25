# outline-cli

Agent-friendly CLI for [Outline](https://github.com/outline/outline) page (document) CRUD operations.

This project talks directly to Outline's RPC API (`/api/documents.*`) and is designed for automation and AI-agent workflows.

## Features (current MVP)

- `login` command with secure OS keychain storage for API keys
- `page get`, `list`, `create`, `update`
- `page append`, `prepend`
- `page move`, `archive`, `delete`, `restore`
- `page search`, `find` (title search)
- JSON output for scripting (`--json`)
- `.env` compatibility with both:
  - `OUTLINE_BASE_URL` / `OUTLINE_API_KEY`
  - `APP_URL` / `API_KEY`

## Install (development)

```bash
bun install
bun run build
```

Run:

```bash
OUTLINE_BASE_URL="https://your-outline.example.com" \
OUTLINE_API_KEY="..." \
node dist/cli.js page list --limit 5 --json
```

Interactive login (stores credentials for future commands):

```bash
node dist/cli.js login
node dist/cli.js page list --limit 5 --json
```

If using a local `.env` file:

```bash
set -a; source .env; set +a
node dist/cli.js page list --limit 5 --json
```

## CLI usage

```bash
node dist/cli.js --help
```

Examples:

```bash
node dist/cli.js login
node dist/cli.js login --base-url https://your-outline.example.com --api-key "..." --skip-verify
node dist/cli.js page get <id> --json
node dist/cli.js page create --title "Draft" --text "Hello" --json
node dist/cli.js page append <id> --stdin --json
node dist/cli.js page delete <id> --json
```

## Authentication precedence

Commands resolve credentials in this order:

1. CLI flags (`--base-url`, `--api-key`)
2. Environment variables (`OUTLINE_BASE_URL` / `OUTLINE_API_KEY`, aliases `APP_URL` / `API_KEY`)
3. Stored credentials from `outline login`

Re-run `outline login` to rotate/update stored credentials.

### Secure storage notes

- API keys are stored in the OS keychain (via `keytar`)
- Base URL metadata is stored in the user config directory
- `--profile` is still reserved and not implemented

## Packaging and releases

This repo includes GitHub Actions workflows for:

- CI (`.github/workflows/ci.yml`)
- tagged releases with cross-platform binaries (`.github/workflows/release.yml`)
- optional Homebrew tap formula updates (same release workflow, if secrets are configured)

### Release flow

1. Push a tag like `v0.1.0`
2. GitHub Actions builds binaries for configured OS/arch targets
3. Artifacts are attached to the GitHub Release
4. Checksums are generated
5. (Optional) Homebrew tap formula is updated and pushed

## Homebrew (custom tap)

After release automation is configured:

```bash
brew tap pirabyte/outline-cli
brew install outline-cli
```

## Required GitHub secrets for Homebrew tap update (optional)

- `HOMEBREW_TAP_PAT`: token with push access to the tap repo

Expected tap repo:

- `pirabyte/homebrew-outline-cli`

## Roadmap

- dotenv auto-loading
- stronger append/prepend semantics for drafts
- profile support
- tests with mocked Outline API responses
