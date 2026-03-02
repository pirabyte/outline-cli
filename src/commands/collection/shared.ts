import type { ParsedArgs } from "../../core/args.js";
import { getFlagString } from "../../core/args.js";
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

export function getCollectionId(args: ParsedArgs): string {
  const id = args.positionals[2] ?? getFlagString(args, "id");
  if (!id) {
    throw new CliUsageError("Missing collection id. Usage: outline collection <command> <id>");
  }
  return id;
}
