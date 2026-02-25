import { CliUsageError } from "./errors.js";
import { createCredentialStore, type CredentialStore } from "./credential-store.js";

export interface OutlineConfig {
  baseUrl: string;
  apiKey: string;
  defaultJson: boolean;
}

export async function loadConfig(overrides?: {
  baseUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
  credentialStore?: CredentialStore;
}): Promise<OutlineConfig> {
  if (overrides?.profile) {
    throw new CliUsageError("Profiles are not implemented yet. Use --base-url and --api-key (or env vars).");
  }

  let baseUrl = normalizeBaseUrl(
    overrides?.baseUrl ?? process.env.OUTLINE_BASE_URL ?? process.env.APP_URL
  );
  let apiKey = (
    overrides?.apiKey ??
    process.env.OUTLINE_API_KEY ??
    process.env.API_KEY ??
    ""
  ).trim();

  if (!baseUrl || !apiKey) {
    const store = overrides?.credentialStore ?? createCredentialStore();
    const stored = await store.loadDefault();
    if (!baseUrl) {
      baseUrl = normalizeBaseUrl(stored?.baseUrl);
    }
    if (!apiKey) {
      apiKey = (stored?.apiKey ?? "").trim();
    }
  }

  if (!baseUrl) {
    throw new CliUsageError(
      "Missing Outline base URL. Set --base-url or OUTLINE_BASE_URL (APP_URL is also supported), or run `outline login`."
    );
  }
  if (!apiKey) {
    throw new CliUsageError(
      "Missing Outline API key. Set --api-key or OUTLINE_API_KEY (API_KEY is also supported), or run `outline login`."
    );
  }

  const envOutput = (process.env.OUTLINE_OUTPUT ?? "").trim().toLowerCase();
  const defaultJson = overrides?.json ?? envOutput === "json";

  return { baseUrl, apiKey, defaultJson };
}

export function normalizeBaseUrl(input?: string): string {
  if (!input) return "";
  return input.trim().replace(/\/+$/, "");
}
