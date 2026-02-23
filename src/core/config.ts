import { CliUsageError } from "./errors.js";

export interface OutlineConfig {
  baseUrl: string;
  apiKey: string;
  defaultJson: boolean;
}

export function loadConfig(overrides?: {
  baseUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}): OutlineConfig {
  if (overrides?.profile) {
    throw new CliUsageError("Profiles are not implemented yet. Use --base-url and --api-key (or env vars).");
  }

  const baseUrl = normalizeBaseUrl(
    overrides?.baseUrl ?? process.env.OUTLINE_BASE_URL ?? process.env.APP_URL
  );
  const apiKey = (
    overrides?.apiKey ??
    process.env.OUTLINE_API_KEY ??
    process.env.API_KEY ??
    ""
  ).trim();

  if (!baseUrl) {
    throw new CliUsageError(
      "Missing Outline base URL. Set --base-url or OUTLINE_BASE_URL (APP_URL is also supported)."
    );
  }
  if (!apiKey) {
    throw new CliUsageError(
      "Missing Outline API key. Set --api-key or OUTLINE_API_KEY (API_KEY is also supported)."
    );
  }

  const envOutput = (process.env.OUTLINE_OUTPUT ?? "").trim().toLowerCase();
  const defaultJson = overrides?.json ?? envOutput === "json";

  return { baseUrl, apiKey, defaultJson };
}

function normalizeBaseUrl(input?: string): string {
  if (!input) return "";
  return input.trim().replace(/\/+$/, "");
}
