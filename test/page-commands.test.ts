import { describe, expect, test } from "bun:test";
import { parseArgv } from "../src/core/args.js";
import { CliUsageError } from "../src/core/errors.js";
import { runPageCommand } from "../src/commands/page/index.js";

describe("runPageCommand append/prepend", () => {
  test("append loads existing text and sends merged update", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];

    const execution = await runPageCommand(
      {
        async post(method: string, body: Record<string, unknown>) {
          calls.push({ method, body });
          if (method === "documents.info") {
            return { ok: true, data: { id: "doc-1", text: "Existing body.\n" } } as never;
          }
          return { ok: true, data: { id: "doc-1" } } as never;
        },
      } as never,
      parseArgv(["page", "append", "doc-1", "--text", "Appended chunk"]),
    );

    expect(calls).toEqual([
      { method: "documents.info", body: { id: "doc-1" } },
      { method: "documents.update", body: { id: "doc-1", text: "Existing body.\nAppended chunk" } },
    ]);
    expect(execution.method).toBe("documents.update");
  });

  test("prepend loads existing text and sends merged update", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];

    const execution = await runPageCommand(
      {
        async post(method: string, body: Record<string, unknown>) {
          calls.push({ method, body });
          if (method === "documents.info") {
            return { ok: true, data: { id: "doc-1", text: "Existing body." } } as never;
          }
          return { ok: true, data: { id: "doc-1" } } as never;
        },
      } as never,
      parseArgv(["page", "prepend", "doc-1", "--text", "Prepended chunk\n"]),
    );

    expect(calls).toEqual([
      { method: "documents.info", body: { id: "doc-1" } },
      { method: "documents.update", body: { id: "doc-1", text: "Prepended chunk\nExisting body." } },
    ]);
    expect(execution.method).toBe("documents.update");
  });

  test("append requires text input", async () => {
    const client = {
      async post() {
        return { ok: true } as never;
      },
    } as never;

    await expect(runPageCommand(client, parseArgv(["page", "append", "doc-1"]))).rejects.toBeInstanceOf(
      CliUsageError,
    );
  });

  test("update with explicit edit-mode still passes mode through", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];

    const execution = await runPageCommand(
      {
        async post(method: string, body: Record<string, unknown>) {
          calls.push({ method, body });
          return { ok: true, data: { id: "doc-1" } } as never;
        },
      } as never,
      parseArgv(["page", "update", "doc-1", "--text", "Chunk", "--edit-mode", "append"]),
    );

    expect(calls).toEqual([
      { method: "documents.update", body: { id: "doc-1", text: "Chunk", editMode: "append" } },
    ]);
    expect(execution.method).toBe("documents.update");
  });
});
