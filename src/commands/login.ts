import type { ParsedArgs } from "../core/args.js";
import { getFlagBoolean, getFlagString, hasFlag } from "../core/args.js";
import { OutlineClient } from "../core/client.js";
import { normalizeBaseUrl } from "../core/config.js";
import {
  createCredentialStore,
  type CredentialStorageKind,
  type CredentialStore,
  type CredentialStorageOption,
} from "../core/credential-store.js";
import { CliUsageError } from "../core/errors.js";
import { promptLine, promptSecret } from "../core/prompt.js";

export interface RootCommandExecution {
  method: string;
  request: Record<string, unknown>;
  response: unknown;
}

export interface LoginCommandDeps {
  credentialStore?: CredentialStore;
  promptLine?: typeof promptLine;
  promptSecret?: typeof promptSecret;
  createClient?: (input: { baseUrl: string; apiKey: string }) => Pick<OutlineClient, "post">;
}

export async function runLoginCommand(
  args: ParsedArgs,
  deps?: LoginCommandDeps,
): Promise<RootCommandExecution> {
  if (hasFlag(args, "help")) {
    throw new CliUsageError(loginHelp());
  }

  const skipVerify = getFlagBoolean(args, "skip-verify") ?? false;
  const credentialStore = deps?.credentialStore ?? createCredentialStore();
  const askLine = deps?.promptLine ?? promptLine;
  const askSecret = deps?.promptSecret ?? promptSecret;
  const createClient = deps?.createClient ?? ((input) => new OutlineClient(input));

  const providedBaseUrl = getFlagString(args, "base-url");
  const providedApiKey = getFlagString(args, "api-key");
  const storageFlag = getFlagString(args, "store");

  const baseUrl = await resolveBaseUrl(providedBaseUrl, askLine);
  const apiKey = await resolveApiKey(providedApiKey, askSecret);
  const storageOptions = await credentialStore.listStorageOptions();
  const storage = await resolveStoragePreference(storageFlag, storageOptions, askLine);

  if (!skipVerify) {
    const client = createClient({ baseUrl, apiKey });
    await client.post("documents.list", { limit: 1 });
  }

  const savedStorage = await credentialStore.saveDefault({ baseUrl, apiKey }, { storage });

  return {
    method: skipVerify ? "auth.login.store" : "auth.login.verify+store",
    request: {
      baseUrl,
      skipVerify,
      storage,
      prompted: {
        baseUrl: !providedBaseUrl,
        apiKey: !providedApiKey,
      },
    },
    response: {
      ok: true,
      baseUrl,
      stored: savedStorage,
      availableStorage: storageOptions,
      verified: !skipVerify,
      apiKey: { redacted: true, hint: redactApiKey(apiKey) },
    },
  };
}

export function loginHelp(): string {
  return [
    "Login command:",
    "  outline login [--base-url URL] [--api-key TOKEN] [--store auto|keychain|file] [--skip-verify] [--json]",
    "",
    "Prompts for any missing values and stores credentials in your selected backend.",
    "By default, credentials are verified before saving using Outline's API.",
  ].join("\n");
}

async function resolveBaseUrl(raw: string | undefined, askLine: typeof promptLine): Promise<string> {
  const value = normalizeBaseUrl(raw ?? await askLine("Outline base URL: "));
  if (!value) {
    throw new CliUsageError("Missing Outline base URL");
  }
  return value;
}

async function resolveApiKey(raw: string | undefined, askSecret: typeof promptSecret): Promise<string> {
  const value = (raw ?? await askSecret("Outline API key: ")).trim();
  if (!value) {
    throw new CliUsageError("Missing Outline API key");
  }
  return value;
}

function redactApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "********";
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}

async function resolveStoragePreference(
  raw: string | undefined,
  options: CredentialStorageOption[],
  askLine: typeof promptLine,
): Promise<CredentialStorageKind> {
  const normalized = (raw ?? "auto").trim().toLowerCase();
  if (!["auto", "keychain", "file"].includes(normalized)) {
    throw new CliUsageError("Invalid --store value. Use: auto, keychain, or file.");
  }

  if (normalized === "keychain" || normalized === "file") {
    return requireAvailableStorage(normalized, options);
  }

  const keychain = options.find((option) => option.kind === "keychain");
  const file = options.find((option) => option.kind === "file");
  const defaultStorage: CredentialStorageKind = keychain?.available ? "keychain" : "file";

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultStorage;
  }

  const keychainLabel = keychain?.available
    ? "keychain (recommended)"
    : `keychain (unavailable: ${keychain?.detail ?? "unknown"})`;
  const fileLabel = file?.available
    ? "file (less secure)"
    : `file (unavailable: ${file?.detail ?? "unknown"})`;

  const prompt = [
    "Choose credential storage:",
    `  1) ${keychainLabel}`,
    `  2) ${fileLabel}`,
    `Select [1-2] (default ${defaultStorage === "keychain" ? "1" : "2"}): `,
  ].join("\n");

  const answer = (await askLine(prompt)).trim();
  const selected =
    answer === "2"
      ? "file"
      : answer === "1"
        ? "keychain"
        : answer === ""
          ? defaultStorage
        : undefined;

  if (!selected) {
    throw new CliUsageError("Invalid storage selection. Choose 1 or 2.");
  }

  return requireAvailableStorage(selected, options);
}

function requireAvailableStorage(
  storage: CredentialStorageKind,
  options: CredentialStorageOption[],
): CredentialStorageKind {
  const match = options.find((option) => option.kind === storage);
  if (!match?.available) {
    throw new CliUsageError(
      `Selected storage backend '${storage}' is unavailable${match?.detail ? `: ${match.detail}` : "."}`
    );
  }
  return storage;
}
