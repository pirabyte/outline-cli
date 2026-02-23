import type { ParsedArgs } from "../../core/args.js";
import { getFlagString, getFlagBoolean } from "../../core/args.js";
import { CliUsageError } from "../../core/errors.js";
import type { OutlineClient } from "../../core/client.js";

export interface CommandContext {
  client: OutlineClient;
  args: ParsedArgs;
}

export interface CommandExecution {
  method: string;
  request: Record<string, unknown>;
  response: unknown;
}

export async function maybeCheckUpdatedAtGuard(
  ctx: CommandContext,
  id: string,
): Promise<void> {
  const expected = getFlagString(ctx.args, "if-updated-at");
  if (!expected) return;

  const info = await ctx.client.post<{ updatedAt?: string }>("documents.info", { id });
  const actual = info.data?.updatedAt;
  if (!actual) {
    throw new CliUsageError(`Unable to evaluate --if-updated-at guard for document ${id}`);
  }
  if (actual !== expected) {
    throw new CliUsageError(
      `Update guard failed for ${id}: expected updatedAt=${expected}, actual=${actual}`,
    );
  }
}

export function getDocumentId(args: ParsedArgs): string {
  const id = args.positionals[2] ?? getFlagString(args, "id");
  if (!id) {
    throw new CliUsageError("Missing document id. Usage: outline page <command> <id>");
  }
  return id;
}

export function getPublishFlag(args: ParsedArgs): boolean | undefined {
  return getFlagBoolean(args, "publish");
}

