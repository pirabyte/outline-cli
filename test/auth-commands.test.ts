import { describe, expect, test } from "bun:test";
import { parseArgv } from "../src/core/args.js";
import { runLoginCommand } from "../src/commands/login.js";
import { runLogoutCommand } from "../src/commands/logout.js";
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
