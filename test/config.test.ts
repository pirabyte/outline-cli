import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig } from "../src/core/config.js";

const ENV_KEYS = ["OUTLINE_BASE_URL", "OUTLINE_API_KEY", "APP_URL", "API_KEY", "OUTLINE_OUTPUT"] as const;
const ORIGINAL_ENV = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("loadConfig", () => {
  test("uses stored credentials when flags and env are absent", async () => {
    for (const key of ENV_KEYS) delete process.env[key];

    const config = await loadConfig({
      credentialStore: {
        async listStorageOptions() {
          return [
            { kind: "keychain", available: true },
            { kind: "file", available: true },
          ];
        },
        async loadDefault() {
          return {
            baseUrl: "https://stored.example.com/",
            apiKey: "stored-key",
            storage: "keychain",
          };
        },
        async saveDefault() {
          return "keychain";
        },
        async clearDefault() {},
      },
    });

    expect(config.baseUrl).toBe("https://stored.example.com");
    expect(config.apiKey).toBe("stored-key");
  });

  test("prefers env over stored credentials and flags over env", async () => {
    process.env.OUTLINE_BASE_URL = "https://env.example.com/";
    process.env.OUTLINE_API_KEY = "env-key";

    const config = await loadConfig({
      baseUrl: "https://flag.example.com/",
      apiKey: "flag-key",
      credentialStore: {
        async listStorageOptions() {
          return [
            { kind: "keychain", available: true },
            { kind: "file", available: true },
          ];
        },
        async loadDefault() {
          return {
            baseUrl: "https://stored.example.com",
            apiKey: "stored-key",
            storage: "keychain",
          };
        },
        async saveDefault() {
          return "keychain";
        },
        async clearDefault() {},
      },
    });

    expect(config.baseUrl).toBe("https://flag.example.com");
    expect(config.apiKey).toBe("flag-key");
  });

  test("allows mixing sources (env baseUrl + stored apiKey)", async () => {
    process.env.OUTLINE_BASE_URL = "https://env.example.com/";
    delete process.env.OUTLINE_API_KEY;
    delete process.env.API_KEY;

    const config = await loadConfig({
      credentialStore: {
        async listStorageOptions() {
          return [
            { kind: "keychain", available: true },
            { kind: "file", available: true },
          ];
        },
        async loadDefault() {
          return {
            baseUrl: "https://stored.example.com",
            apiKey: "stored-key",
            storage: "keychain",
          };
        },
        async saveDefault() {
          return "keychain";
        },
        async clearDefault() {},
      },
    });

    expect(config.baseUrl).toBe("https://env.example.com");
    expect(config.apiKey).toBe("stored-key");
  });

  test("mentions outline login in missing-auth errors", async () => {
    for (const key of ENV_KEYS) delete process.env[key];

    await expect(
      loadConfig({
        credentialStore: {
          async listStorageOptions() {
            return [
              { kind: "keychain", available: true },
              { kind: "file", available: true },
            ];
          },
          async loadDefault() {
            return undefined;
          },
          async saveDefault() {
            return "keychain";
          },
          async clearDefault() {},
        },
      })
    ).rejects.toThrow("outline login");
  });
});
