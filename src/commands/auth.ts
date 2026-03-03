import type { ParsedArgs } from "../core/args.js";
import { getFlagBoolean, getFlagString, hasFlag } from "../core/args.js";
import { OutlineClient } from "../core/client.js";
import { loadConfig, normalizeBaseUrl, type OutlineConfig } from "../core/config.js";
import { createCredentialStore, type CredentialStore } from "../core/credential-store.js";
import { CliUsageError } from "../core/errors.js";

export interface RootCommandExecution {
  method: string;
  request: Record<string, unknown>;
  response: unknown;
}

export interface AuthCommandDeps {
  credentialStore?: CredentialStore;
  loadConfig?: (overrides?: {
    baseUrl?: string;
    apiKey?: string;
    json?: boolean;
    profile?: string;
    credentialStore?: CredentialStore;
  }) => Promise<OutlineConfig>;
  createClient?: (input: { baseUrl: string; apiKey: string }) => Pick<OutlineClient, "post">;
}

type ValueSource = "flag" | "env" | "stored" | "none";

export async function runAuthCommand(args: ParsedArgs, deps?: AuthCommandDeps): Promise<RootCommandExecution> {
  const subcommand = args.positionals[1];
  if (!subcommand || hasFlag(args, "help")) {
    throw new CliUsageError(authHelp());
  }

  switch (subcommand) {
    case "status":
      return runAuthStatus(args, deps);
    case "whoami":
      return runAuthWhoami(args, deps);
    case "help":
      throw new CliUsageError(authHelp());
    default:
      throw new CliUsageError(`Unknown auth subcommand: ${subcommand}\n\n${authHelp()}`);
  }
}

export function authHelp(): string {
  return [
    "Auth commands:",
    "  outline auth status [--verify] [--json]",
    "  outline auth whoami [--json]",
    "",
    "Use `status` to inspect configured auth sources and optionally verify credentials.",
    "Use `whoami` to fetch authenticated user/team info from Outline.",
  ].join("\n");
}

async function runAuthStatus(args: ParsedArgs, deps?: AuthCommandDeps): Promise<RootCommandExecution> {
  const credentialStore = deps?.credentialStore ?? createCredentialStore();
  const verify = getFlagBoolean(args, "verify") ?? false;
  const storageOptions = await credentialStore.listStorageOptions();

  const flagBaseUrl = normalizeBaseUrl(getFlagString(args, "base-url"));
  const flagApiKey = (getFlagString(args, "api-key") ?? "").trim();
  const envBaseUrl = normalizeBaseUrl(process.env.OUTLINE_BASE_URL);
  const envApiKey = (process.env.OUTLINE_API_KEY ?? "").trim();

  let storedLoadError: string | undefined;
  let storedBaseUrl = "";
  let storedApiKey = "";
  let storedStorage: string | undefined;
  try {
    const stored = await credentialStore.loadDefault();
    storedBaseUrl = normalizeBaseUrl(stored?.baseUrl);
    storedApiKey = (stored?.apiKey ?? "").trim();
    storedStorage = stored?.storage;
  } catch (error) {
    storedLoadError = formatErrorMessage(error);
  }

  const effectiveBaseUrl = firstNonEmpty(flagBaseUrl, envBaseUrl, storedBaseUrl);
  const effectiveApiKey = firstNonEmpty(flagApiKey, envApiKey, storedApiKey);
  const baseUrlSource = detectSource(flagBaseUrl, envBaseUrl, storedBaseUrl);
  const apiKeySource = detectSource(flagApiKey, envApiKey, storedApiKey);

  let verification: { ok: boolean; method?: string; error?: string } | undefined;
  if (verify && effectiveBaseUrl && effectiveApiKey) {
    const createClient = deps?.createClient ?? ((input) => new OutlineClient(input));
    try {
      const client = createClient({ baseUrl: effectiveBaseUrl, apiKey: effectiveApiKey });
      await client.post("documents.list", { limit: 1 });
      verification = { ok: true, method: "documents.list" };
    } catch (error) {
      verification = { ok: false, method: "documents.list", error: formatErrorMessage(error) };
    }
  }

  return {
    method: "auth.status",
    request: { verify },
    response: {
      ok: true,
      configured: Boolean(effectiveBaseUrl && effectiveApiKey),
      baseUrl: effectiveBaseUrl || undefined,
      sources: {
        baseUrl: baseUrlSource,
        apiKey: apiKeySource,
      },
      presence: {
        baseUrl: Boolean(effectiveBaseUrl),
        apiKey: Boolean(effectiveApiKey),
      },
      storedStorage,
      availableStorage: storageOptions,
      verification,
      storedCheck: {
        ok: !storedLoadError,
        error: storedLoadError,
      },
    },
  };
}

async function runAuthWhoami(args: ParsedArgs, deps?: AuthCommandDeps): Promise<RootCommandExecution> {
  const credentialStore = deps?.credentialStore ?? createCredentialStore();
  const loadConfigFn = deps?.loadConfig ?? loadConfig;
  const createClient = deps?.createClient ?? ((input) => new OutlineClient(input));

  const config = await loadConfigFn({
    baseUrl: getFlagString(args, "base-url"),
    apiKey: getFlagString(args, "api-key"),
    json: getFlagBoolean(args, "json"),
    profile: getFlagString(args, "profile"),
    credentialStore,
  });

  const client = createClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  const response = await client.post("auth.info", {});

  return {
    method: "auth.info",
    request: {},
    response,
  };
}

function detectSource(flagValue: string, envValue: string, storedValue: string): ValueSource {
  if (flagValue) return "flag";
  if (envValue) return "env";
  if (storedValue) return "stored";
  return "none";
}

function firstNonEmpty(...values: string[]): string {
  for (const value of values) {
    if (value) return value;
  }
  return "";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
