import type { ParsedArgs } from "../../core/args.js";
import { CliUsageError } from "../../core/errors.js";
import type { OutlineClient } from "../../core/client.js";
import { runCollectionCreate } from "./create.js";
import { runCollectionDelete } from "./delete.js";
import { runCollectionGet } from "./get.js";
import { runCollectionList } from "./list.js";
import { runCollectionUpdate } from "./update.js";
import type { CommandExecution } from "./shared.js";

export async function runCollectionCommand(client: OutlineClient, args: ParsedArgs): Promise<CommandExecution> {
  const subcommand = args.positionals[1];
  if (!subcommand) {
    throw new CliUsageError(collectionHelp());
  }

  const ctx = { client, args };

  switch (subcommand) {
    case "get":
      return runCollectionGet(ctx);
    case "list":
      return runCollectionList(ctx);
    case "create":
      return runCollectionCreate(ctx);
    case "update":
      return runCollectionUpdate(ctx);
    case "delete":
      return runCollectionDelete(ctx);
    case "help":
      throw new CliUsageError(collectionHelp());
    default:
      throw new CliUsageError(`Unknown collection subcommand: ${subcommand}\n\n${collectionHelp()}`);
  }
}

export function collectionHelp(): string {
  return [
    "Collection commands:",
    "  outline collection get <id>",
    "  outline collection list [--limit N] [--offset N]",
    "  outline collection create --name NAME [--description TXT|null] [--permission read_write|read] [--private true|false] [--color HEX|null] [--icon ICON|null]",
    "  outline collection update <id> [--name NAME] [--description TXT|null] [--permission read_write|read] [--private true|false] [--color HEX|null] [--icon ICON|null]",
    "  outline collection delete <id>",
  ].join("\n");
}
