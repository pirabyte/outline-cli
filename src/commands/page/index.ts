import type { ParsedArgs } from "../../core/args.js";
import { CliUsageError } from "../../core/errors.js";
import type { OutlineClient } from "../../core/client.js";
import { runPageArchive } from "./archive.js";
import { runPageCreate } from "./create.js";
import { runPageDelete } from "./delete.js";
import { runPageGet } from "./get.js";
import { runPageList } from "./list.js";
import { runPageMove } from "./move.js";
import { runPageRestore } from "./restore.js";
import { runPageSearch, runPageFind } from "./search.js";
import { runPageAppend, runPagePrepend, runPageUpdate } from "./update.js";
import type { CommandExecution } from "./shared.js";

export async function runPageCommand(client: OutlineClient, args: ParsedArgs): Promise<CommandExecution> {
  const subcommand = args.positionals[1];
  if (!subcommand) {
    throw new CliUsageError(pageHelp());
  }

  const ctx = { client, args };

  switch (subcommand) {
    case "get":
      return runPageGet(ctx);
    case "list":
      return runPageList(ctx);
    case "create":
      return runPageCreate(ctx);
    case "update":
      return runPageUpdate(ctx);
    case "append":
      return runPageAppend(ctx);
    case "prepend":
      return runPagePrepend(ctx);
    case "move":
      return runPageMove(ctx);
    case "archive":
      return runPageArchive(ctx);
    case "delete":
      return runPageDelete(ctx);
    case "restore":
      return runPageRestore(ctx);
    case "search":
      return runPageSearch(ctx);
    case "find":
      return runPageFind(ctx);
    case "help":
      throw new CliUsageError(pageHelp());
    default:
      throw new CliUsageError(`Unknown page subcommand: ${subcommand}\n\n${pageHelp()}`);
  }
}

export function pageHelp(): string {
  return [
    "Page commands:",
    "  outline page get <id>",
    "  outline page list [--collection-id ID] [--parent-id ID|null] [--status published,draft,archived]",
    "  outline page create [--title T] [--text TXT|--file PATH|--stdin] [--collection-id ID|--parent-id ID] [--publish]",
    "  outline page update <id> [--title T] [--text TXT|--file PATH|--stdin] [--edit-mode replace|append|prepend]",
    "  outline page append <id> --text TXT|--file PATH|--stdin",
    "  outline page prepend <id> --text TXT|--file PATH|--stdin",
    "  outline page move <id> [--collection-id ID] [--parent-id ID|null] [--index N]",
    "  outline page archive <id>",
    "  outline page delete <id> [--permanent]",
    "  outline page restore <id> [--collection-id ID] [--revision-id ID]",
    "  outline page search --query TEXT",
    "  outline page find --query TEXT",
  ].join("\n");
}

