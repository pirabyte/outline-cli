import { describe, expect, test } from "bun:test";
import { parseArgv } from "../src/core/args.js";
import { runLoginCommand } from "../src/commands/login.js";
import { runLogoutCommand } from "../src/commands/logout.js";
import { runAuthCommand } from "../src/commands/auth.js";
import { OutlineApiError } from "../src/core/errors.js";

describe("runLoginCommand", () => {
  test("prompts, verifies, and saves credentials", async () => {
    const saved: Array<{ baseUrl: string; apiKey: string }> = [];
    const clientCalls: Array<{ method: string; body: Record<string, unknown> }> = [];

    const execution = await runLoginCommand(parseArgv(["login"]), {
      promptLine: async () => "https://example.com/",
      promptSecret: async () => "secret-token",
      credentialStore: {
        async loadDefault() {
          return undefined;
        },
        async saveDefault(credentials) {
          saved.push(credentials);
        },
        async clearDefault() {},
      },
      createClient: () => ({
        async post(method: string, body: Record<string, unknown>) {
          clientCalls.push({ method, body });
          return { ok: true } as unknown as never;
        },
      }),
    });

    expect(clientCalls).toEqual([{ method: "documents.list", body: { limit: 1 } }]);
    expect(saved).toEqual([{ baseUrl: "https://example.com", apiKey: "secret-token" }]);
    expect(JSON.stringify(execution)).not.toContain("secret-token");
    expect(execution.response).toMatchObject({ verified: true, stored: "keychain" });
  });

  test("skip-verify stores without client call", async () => {
    let saved = false;
    let clientCreated = false;

    const execution = await runLoginCommand(
      parseArgv(["login", "--base-url", "https://example.com", "--api-key", "abc", "--skip-verify"]),
      {
        credentialStore: {
          async loadDefault() {
            return undefined;
          },
          async saveDefault() {
            saved = true;
          },
          async clearDefault() {},
        },
        createClient: () => {
          clientCreated = true;
          return { async post() { return {} as never; } };
        },
      }
    );

    expect(saved).toBe(true);
    expect(clientCreated).toBe(false);
    expect(execution.response).toMatchObject({ verified: false });
  });

  test("does not save on verification failure", async () => {
    let saved = false;

    await expect(
      runLoginCommand(parseArgv(["login", "--base-url", "https://example.com", "--api-key", "abc"]), {
        credentialStore: {
          async loadDefault() {
            return undefined;
          },
          async saveDefault() {
            saved = true;
          },
          async clearDefault() {},
        },
        createClient: () => ({
          async post() {
            throw new OutlineApiError("Unauthorized", { statusCode: 401 });
          },
        }),
      })
    ).rejects.toThrow("Unauthorized");

    expect(saved).toBe(false);
  });
});

describe("runLogoutCommand", () => {
  test("clears stored credentials", async () => {
    let cleared = false;

    const execution = await runLogoutCommand(parseArgv(["logout"]), {
      credentialStore: {
        async loadDefault() {
          return undefined;
        },
        async saveDefault() {},
        async clearDefault() {
          cleared = true;
        },
      },
    });

    expect(cleared).toBe(true);
    expect(execution.response).toMatchObject({ ok: true, cleared: true });
  });
});

describe("runAuthCommand", () => {
  test("status reports effective sources and can verify", async () => {
    const originalEnv = {
      OUTLINE_BASE_URL: process.env.OUTLINE_BASE_URL,
      OUTLINE_API_KEY: process.env.OUTLINE_API_KEY,
      APP_URL: process.env.APP_URL,
      API_KEY: process.env.API_KEY,
    };
    process.env.OUTLINE_BASE_URL = "https://env.example.com";
    delete process.env.OUTLINE_API_KEY;
    delete process.env.APP_URL;
    delete process.env.API_KEY;

    const clientCalls: Array<{ method: string; body: Record<string, unknown> }> = [];
    try {
      const execution = await runAuthCommand(parseArgv(["auth", "status", "--verify"]), {
        credentialStore: {
          async loadDefault() {
            return { baseUrl: "https://stored.example.com", apiKey: "stored-key" };
          },
          async saveDefault() {},
          async clearDefault() {},
        },
        createClient: () => ({
          async post(method: string, body: Record<string, unknown>) {
            clientCalls.push({ method, body });
            return { ok: true } as never;
          },
        }),
      });

      expect(clientCalls).toEqual([{ method: "documents.list", body: { limit: 1 } }]);
      expect(execution.method).toBe("auth.status");
      expect(execution.response).toMatchObject({
        configured: true,
        baseUrl: "https://env.example.com",
        sources: { baseUrl: "env", apiKey: "stored" },
        verification: { ok: true, method: "documents.list" },
      });
    } finally {
      restoreEnv(originalEnv);
    }
  });

  test("status handles stored credential check errors without throwing", async () => {
    const originalEnv = {
      OUTLINE_BASE_URL: process.env.OUTLINE_BASE_URL,
      OUTLINE_API_KEY: process.env.OUTLINE_API_KEY,
      APP_URL: process.env.APP_URL,
      API_KEY: process.env.API_KEY,
    };
    delete process.env.OUTLINE_BASE_URL;
    delete process.env.OUTLINE_API_KEY;
    delete process.env.APP_URL;
    delete process.env.API_KEY;

    try {
      const execution = await runAuthCommand(parseArgv(["auth", "status"]), {
        credentialStore: {
          async loadDefault() {
            throw new Error("keychain unavailable");
          },
          async saveDefault() {},
          async clearDefault() {},
        },
      });

      expect(execution.response).toMatchObject({
        configured: false,
        storedCheck: { ok: false, error: "keychain unavailable" },
        sources: { baseUrl: "none", apiKey: "none" },
      });
    } finally {
      restoreEnv(originalEnv);
    }
  });

  test("whoami resolves config and calls auth.info", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
    const execution = await runAuthCommand(parseArgv(["auth", "whoami"]), {
      loadConfig: async () => ({
        baseUrl: "https://example.com",
        apiKey: "token",
        defaultJson: false,
      }),
      createClient: () => ({
        async post(method: string, body: Record<string, unknown>) {
          calls.push({ method, body });
          return { ok: true, data: { user: { id: "u1", name: "Felix" } } } as never;
        },
      }),
      credentialStore: {
        async loadDefault() {
          return undefined;
        },
        async saveDefault() {},
        async clearDefault() {},
      },
    });

    expect(calls).toEqual([{ method: "auth.info", body: {} }]);
    expect(execution.method).toBe("auth.info");
    expect(execution.response).toMatchObject({ ok: true, data: { user: { id: "u1" } } });
  });
});

function restoreEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
