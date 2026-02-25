import type { ParsedArgs } from "../core/args.js";
import { getFlagBoolean, getFlagString, hasFlag } from "../core/args.js";
import { OutlineClient } from "../core/client.js";
import { normalizeBaseUrl } from "../core/config.js";
import { createCredentialStore, type CredentialStore } from "../core/credential-store.js";
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

  const baseUrl = await resolveBaseUrl(providedBaseUrl, askLine);
  const apiKey = await resolveApiKey(providedApiKey, askSecret);

  if (!skipVerify) {
    const client = createClient({ baseUrl, apiKey });
    await client.post("documents.list", { limit: 1 });
  }

  await credentialStore.saveDefault({ baseUrl, apiKey });

  return {
    method: skipVerify ? "auth.login.store" : "auth.login.verify+store",
    request: {
      baseUrl,
      skipVerify,
      prompted: {
        baseUrl: !providedBaseUrl,
        apiKey: !providedApiKey,
      },
    },
    response: {
      ok: true,
      baseUrl,
      stored: "keychain",
      verified: !skipVerify,
      apiKey: { redacted: true, hint: redactApiKey(apiKey) },
    },
  };
}

export function loginHelp(): string {
  return [
    "Login command:",
    "  outline login [--base-url URL] [--api-key TOKEN] [--skip-verify] [--json]",
    "",
    "Prompts for any missing values and stores credentials securely in the OS keychain.",
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
