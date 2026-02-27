import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CliUsageError } from "./errors.js";

const KEYCHAIN_SERVICE = "outline-cli";
const KEYCHAIN_ACCOUNT_DEFAULT = "default";

export type CredentialStorageKind = "keychain" | "file";

interface StoredCredentialMetadata {
  baseUrl: string;
  storage: CredentialStorageKind;
  apiKey?: string;
}

export interface StoredCredentials {
  baseUrl: string;
  apiKey: string;
}

export interface StoredCredentialsRecord extends StoredCredentials {
  storage: CredentialStorageKind;
}

export interface CredentialStorageOption {
  kind: CredentialStorageKind;
  available: boolean;
  detail?: string;
}

export interface CredentialStore {
  listStorageOptions(): Promise<CredentialStorageOption[]>;
  loadDefault(): Promise<StoredCredentialsRecord | undefined>;
  saveDefault(credentials: StoredCredentials, options?: { storage?: CredentialStorageKind }): Promise<CredentialStorageKind>;
  clearDefault(): Promise<void>;
}

export function createCredentialStore(): CredentialStore {
  return {
    async listStorageOptions() {
      const keytarState = await loadKeytarOptional();
      return [
        {
          kind: "keychain",
          available: Boolean(keytarState.keytar),
          detail: keytarState.error,
        },
        {
          kind: "file",
          available: true,
          detail: "Stores API key in a local 0600 config file",
        },
      ];
    },

    async loadDefault() {
      const metadata = await readMetadata();
      if (!metadata?.baseUrl) return undefined;

      if (metadata.storage === "file") {
        const fileApiKey = (metadata.apiKey ?? "").trim();
        if (!fileApiKey) return undefined;
        return {
          baseUrl: normalizeBaseUrl(metadata.baseUrl),
          apiKey: fileApiKey,
          storage: "file",
        };
      }

      const keytarState = await loadKeytarOptional();
      if (!keytarState.keytar) {
        throw new CliUsageError(
          `Stored credentials use keychain, but keychain access is unavailable. ${keytarState.error ?? ""}`.trim()
        );
      }

      const apiKey = await keytarState.keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT_DEFAULT);
      if (!apiKey) return undefined;

      return {
        baseUrl: normalizeBaseUrl(metadata.baseUrl),
        apiKey: apiKey.trim(),
        storage: "keychain",
      };
    },

    async saveDefault(credentials, options) {
      const baseUrl = normalizeBaseUrl(credentials.baseUrl);
      const apiKey = credentials.apiKey.trim();
      const targetStorage = options?.storage ?? "keychain";

      if (!baseUrl) {
        throw new CliUsageError("Cannot save credentials: missing base URL");
      }
      if (!apiKey) {
        throw new CliUsageError("Cannot save credentials: missing API key");
      }

      if (targetStorage === "keychain") {
        const keytarState = await loadKeytarOptional();
        if (!keytarState.keytar) {
          throw new CliUsageError(
            `Keychain storage is unavailable on this system. ${keytarState.error ?? ""}`.trim()
          );
        }
        await keytarState.keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT_DEFAULT, apiKey);
        await writeMetadata({ baseUrl, storage: "keychain" });
        return "keychain";
      }

      await writeMetadata({ baseUrl, storage: "file", apiKey });
      return "file";
    },

    async clearDefault() {
      const keytarState = await loadKeytarOptional();
      if (keytarState.keytar) {
        await keytarState.keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT_DEFAULT);
      }
      await writeMetadata({ baseUrl: "", storage: "keychain" });
    },
  };
}

async function readMetadata(): Promise<StoredCredentialMetadata | undefined> {
  const file = getMetadataFilePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;

    const record = parsed as Record<string, unknown>;
    const baseUrl = typeof record.baseUrl === "string" ? record.baseUrl : "";
    if (!baseUrl.trim()) return undefined;

    const storageRaw = record.storage;
    const storage: CredentialStorageKind =
      storageRaw === "file" || storageRaw === "keychain"
        ? storageRaw
        : "keychain";

    const apiKey = typeof record.apiKey === "string" ? record.apiKey : undefined;

    return { baseUrl, storage, apiKey };
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw new CliUsageError(`Failed to read stored login metadata: ${formatErrorMessage(error)}`);
  }
}

async function writeMetadata(metadata: StoredCredentialMetadata): Promise<void> {
  const file = getMetadataFilePath();
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });

  const payload: Record<string, unknown> = {
    baseUrl: metadata.baseUrl,
    storage: metadata.storage,
  };
  if (metadata.storage === "file") {
    payload.apiKey = metadata.apiKey ?? "";
  }

  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

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

async function loadKeytarOptional(): Promise<{ keytar?: KeytarLike; error?: string }> {
  try {
    // @ts-ignore keytar may not have local types in all environments
    const mod = await import("keytar");
    const keytar = ((mod as Record<string, unknown>).default ?? mod) as Partial<KeytarLike>;
    if (
      typeof keytar.getPassword !== "function" ||
      typeof keytar.setPassword !== "function" ||
      typeof keytar.deletePassword !== "function"
    ) {
      return { error: "Invalid keytar module shape" };
    }
    return { keytar: keytar as KeytarLike };
  } catch (error) {
    return { error: formatErrorMessage(error) };
  }
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "ENOENT");
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
