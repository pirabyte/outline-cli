import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CliUsageError } from "./errors.js";

const KEYCHAIN_SERVICE = "outline-cli";
const KEYCHAIN_ACCOUNT_DEFAULT = "default";

interface StoredCredentialMetadata {
  baseUrl: string;
}

export interface StoredCredentials {
  baseUrl: string;
  apiKey: string;
}

export interface CredentialStore {
  loadDefault(): Promise<StoredCredentials | undefined>;
  saveDefault(credentials: StoredCredentials): Promise<void>;
  clearDefault(): Promise<void>;
}

export function createCredentialStore(): CredentialStore {
  return {
    async loadDefault() {
      const metadata = await readMetadata();
      if (!metadata?.baseUrl) return undefined;

      const keytar = await loadKeytar();
      const apiKey = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT_DEFAULT);
      if (!apiKey) return undefined;

      return {
        baseUrl: normalizeBaseUrl(metadata.baseUrl),
        apiKey: apiKey.trim(),
      };
    },

    async saveDefault(credentials) {
      const baseUrl = normalizeBaseUrl(credentials.baseUrl);
      const apiKey = credentials.apiKey.trim();

      if (!baseUrl) {
        throw new CliUsageError("Cannot save credentials: missing base URL");
      }
      if (!apiKey) {
        throw new CliUsageError("Cannot save credentials: missing API key");
      }

      const keytar = await loadKeytar();
      await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT_DEFAULT, apiKey);
      await writeMetadata({ baseUrl });
    },

    async clearDefault() {
      const keytar = await loadKeytar();
      await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT_DEFAULT);
      await writeMetadata({ baseUrl: "" });
    },
  };
}

async function readMetadata(): Promise<StoredCredentialMetadata | undefined> {
  const file = getMetadataFilePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    const baseUrl = (parsed as Record<string, unknown>).baseUrl;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) return undefined;
    return { baseUrl };
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw new CliUsageError(`Failed to read stored login metadata: ${formatErrorMessage(error)}`);
  }
}

async function writeMetadata(metadata: StoredCredentialMetadata): Promise<void> {
  const file = getMetadataFilePath();
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });

  const payload = JSON.stringify({ baseUrl: metadata.baseUrl }, null, 2);
  await writeFile(file, `${payload}\n`, { encoding: "utf8", mode: 0o600 });

  if (process.platform !== "win32") {
    await chmod(file, 0o600);
  }
}

function getMetadataFilePath(): string {
  return path.join(getConfigDir(), "auth.json");
}

function getConfigDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "outline-cli");
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA?.trim();
    return path.join(appData || path.join(os.homedir(), "AppData", "Roaming"), "outline-cli");
  }

  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  return path.join(xdg || path.join(os.homedir(), ".config"), "outline-cli");
}

function normalizeBaseUrl(input?: string): string {
  if (!input) return "";
  return input.trim().replace(/\/+$/, "");
}

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

async function loadKeytar(): Promise<KeytarLike> {
  try {
    // @ts-ignore keytar is a runtime dependency that may not provide local types before install
    const mod = await import("keytar");
    const keytar = ((mod as Record<string, unknown>).default ?? mod) as Partial<KeytarLike>;
    if (
      typeof keytar.getPassword !== "function" ||
      typeof keytar.setPassword !== "function" ||
      typeof keytar.deletePassword !== "function"
    ) {
      throw new Error("Invalid keytar module shape");
    }
    return keytar as KeytarLike;
  } catch (error) {
    throw new CliUsageError(
      `Secure credential storage is unavailable (keytar). Install dependencies or provide --base-url/--api-key (or env vars). ${formatErrorMessage(error)}`
    );
  }
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "ENOENT");
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
