import { describe, expect, test } from "bun:test";
import { parseArgv } from "../src/core/args.js";
import { CliUsageError } from "../src/core/errors.js";
import { runCollectionCommand } from "../src/commands/collection/index.js";

describe("runCollectionCommand", () => {
  test("list maps to collections.list and forwards pagination", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];

    const execution = await runCollectionCommand(
      {
        async post(method: string, body: Record<string, unknown>) {
          calls.push({ method, body });
          return { ok: true, data: [] } as never;
        },
      } as never,
      parseArgv(["collection", "list", "--limit", "5", "--offset", "10"]),
    );

    expect(calls).toEqual([{ method: "collections.list", body: { limit: 5, offset: 10 } }]);
    expect(execution.method).toBe("collections.list");
  });

  test("create maps to collections.create", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];

    const execution = await runCollectionCommand(
      {
        async post(method: string, body: Record<string, unknown>) {
          calls.push({ method, body });
          return { ok: true, data: { id: "c1" } } as never;
        },
      } as never,
      parseArgv([
        "collection",
        "create",
        "--name",
        "Engineering",
        "--description",
        "Team docs",
        "--permission",
        "read_write",
        "--private",
        "true",
      ]),
    );

    expect(calls).toEqual([
      {
        method: "collections.create",
        body: { name: "Engineering", description: "Team docs", permission: "read_write", private: true },
      },
    ]);
    expect(execution.method).toBe("collections.create");
  });

  test("get/update/delete include id", async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
    const client = {
      async post(method: string, body: Record<string, unknown>) {
        calls.push({ method, body });
        return { ok: true } as never;
      },
    } as never;

    await runCollectionCommand(client, parseArgv(["collection", "get", "col-1"]));
    await runCollectionCommand(client, parseArgv(["collection", "update", "col-1", "--name", "New Name"]));
    await runCollectionCommand(client, parseArgv(["collection", "delete", "col-1"]));

    expect(calls).toEqual([
      { method: "collections.info", body: { id: "col-1" } },
      { method: "collections.update", body: { id: "col-1", name: "New Name" } },
      { method: "collections.delete", body: { id: "col-1" } },
    ]);
  });

  test("throws usage error on unknown subcommand", async () => {
    await expect(runCollectionCommand({} as never, parseArgv(["collection", "bogus"]))).rejects.toBeInstanceOf(
      CliUsageError,
    );
  });
});
