#!/usr/bin/env node

import process from "node:process";
import { parseArgv, getFlagBoolean, getFlagString, hasFlag } from "./core/args.js";
import { loadConfig } from "./core/config.js";
import { OutlineClient } from "./core/client.js";
import { CliUsageError, OutlineApiError, mapErrorToExitCode } from "./core/errors.js";
import { printOutput } from "./core/output.js";
import { runPageCommand, pageHelp } from "./commands/page/index.js";
import { runCollectionCommand, collectionHelp } from "./commands/collection/index.js";
import { loginHelp, runLoginCommand } from "./commands/login.js";
import { logoutHelp, runLogoutCommand } from "./commands/logout.js";
import { authHelp, runAuthCommand } from "./commands/auth.js";

async function main(): Promise<void> {
  const args = parseArgv(process.argv.slice(2));

  if (args.positionals.length === 0 || hasFlag(args, "help")) {
    throw new CliUsageError(rootHelp());
  }

  const rootCommand = args.positionals[0];
  const jsonFlag = getFlagBoolean(args, "json");
  const quietFlag = getFlagBoolean(args, "quiet");

  if (rootCommand === "help") {
    throw new CliUsageError(rootHelp());
  }

  if (rootCommand === "login") {
    if (hasFlag(args, "dry-run")) {
      throw new CliUsageError("The login command does not support --dry-run.");
    }

    const execution = await runLoginCommand(args);
    printOutput(
      {
        command: "login",
        method: execution.method,
        request: execution.request,
        response: execution.response,
      },
      { json: jsonFlag ?? false, quiet: quietFlag },
    );
    return;
  }

  if (rootCommand === "logout") {
    if (hasFlag(args, "dry-run")) {
      throw new CliUsageError("The logout command does not support --dry-run.");
    }

    const execution = await runLogoutCommand(args);
    printOutput(
      {
        command: "logout",
        method: execution.method,
        request: execution.request,
        response: execution.response,
      },
      { json: jsonFlag ?? false, quiet: quietFlag },
    );
    return;
  }

  if (rootCommand === "auth") {
    if (hasFlag(args, "dry-run")) {
      throw new CliUsageError("The auth command does not support --dry-run.");
    }

    const execution = await runAuthCommand(args);
    printOutput(
      {
        command: `auth ${args.positionals[1] ?? ""}`.trim(),
        method: execution.method,
        request: execution.request,
        response: execution.response,
      },
      { json: jsonFlag ?? false, quiet: quietFlag },
    );
    return;
  }

  const config = await loadConfig({
    baseUrl: getFlagString(args, "base-url"),
    apiKey: getFlagString(args, "api-key"),
    json: jsonFlag,
    profile: getFlagString(args, "profile"),
  });
  const client = new OutlineClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });

  if (hasFlag(args, "dry-run")) {
    const execution = await dispatch(rootCommand, client, args, true);
    printOutput(
      {
        command: `${rootCommand} (dry-run)`,
        method: execution.method,
        request: execution.request,
        response: { dryRun: true },
      },
      { json: jsonFlag ?? config.defaultJson, quiet: quietFlag },
    );
    return;
  }

  const execution = await dispatch(rootCommand, client, args, false);

  printOutput(
    {
      command: rootCommand,
      method: execution.method,
      request: execution.request,
      response: execution.response,
    },
    { json: jsonFlag ?? config.defaultJson, quiet: quietFlag },
  );
}

async function dispatch(
  rootCommand: string,
  client: OutlineClient,
  args: ReturnType<typeof parseArgv>,
  dryRun: boolean,
) {
  switch (rootCommand) {
    case "page": {
      if (dryRun) {
        return buildDryRunForPage(args);
      }
      return runPageCommand(client, args);
    }
    case "collection": {
      if (dryRun) {
        return buildDryRunForCollection(args);
      }
      return runCollectionCommand(client, args);
    }
    case "help":
      throw new CliUsageError(rootHelp());
    case "login":
      throw new CliUsageError(loginHelp());
    case "logout":
      throw new CliUsageError(logoutHelp());
    case "auth":
      throw new CliUsageError(authHelp());
    default:
      throw new CliUsageError(`Unknown command: ${rootCommand}\n\n${rootHelp()}`);
  }
}

async function buildDryRunForPage(args: ReturnType<typeof parseArgv>) {
  const subcommand = args.positionals[1];
  if (!subcommand) {
    throw new CliUsageError(pageHelp());
  }

  const methodBySubcommand: Record<string, string> = {
    get: "documents.info",
    list: "documents.list",
    create: "documents.create",
    update: "documents.update",
    append: "documents.update",
    prepend: "documents.update",
    move: "documents.move",
    archive: "documents.archive",
    delete: "documents.delete",
    restore: "documents.restore",
    search: "documents.search",
    find: "documents.search_titles",
  };

  const method = methodBySubcommand[subcommand];
  if (!method) {
    throw new CliUsageError(`Unsupported dry-run for page subcommand: ${subcommand}`);
  }

  const request = {
    note: "Dry-run only previews method mapping. Full request payload preview will be added in a later iteration.",
    positionals: args.positionals,
    flags: args.flags,
  };

  return { method, request, response: { dryRun: true } };
}

async function buildDryRunForCollection(args: ReturnType<typeof parseArgv>) {
  const subcommand = args.positionals[1];
  if (!subcommand) {
    throw new CliUsageError(collectionHelp());
  }

  const methodBySubcommand: Record<string, string> = {
    get: "collections.info",
    list: "collections.list",
    create: "collections.create",
    update: "collections.update",
    delete: "collections.delete",
  };

  const method = methodBySubcommand[subcommand];
  if (!method) {
    throw new CliUsageError(`Unsupported dry-run for collection subcommand: ${subcommand}`);
  }

  const request = {
    note: "Dry-run only previews method mapping. Full request payload preview will be added in a later iteration.",
    positionals: args.positionals,
    flags: args.flags,
  };

  return { method, request, response: { dryRun: true } };
}

function rootHelp(): string {
  return [
    "Outline CLI (MVP)",
    "",
    "Required auth config:",
    "  --base-url https://your-outline.example.com",
    "  --api-key <token>",
    "  or env vars: OUTLINE_BASE_URL / OUTLINE_API_KEY",
    "  or run: outline login",
    "",
    "Global flags:",
    "  --json            JSON output",
    "  --quiet           Minimal output",
    "  --dry-run         Preview command mapping (MVP)",
    "  --profile NAME    Reserved (not implemented yet)",
    "  --help",
    "",
    "Commands:",
    "  outline login [options]",
    "  outline logout [options]",
    "  outline auth <status|whoami> [options]",
    "  outline page <subcommand> [options]",
    "  outline collection <subcommand> [options]",
    "",
    authHelp(),
    "",
    pageHelp(),
    "",
    collectionHelp(),
  ].join("\n");
}

main().catch((error: unknown) => {
  const exitCode = mapErrorToExitCode(error);

  if (error instanceof CliUsageError) {
    process.stderr.write(`${error.message}\n`);
  } else if (error instanceof OutlineApiError) {
    process.stderr.write(`${error.message}\n`);
    if (error.retryAfterSeconds !== undefined) {
      process.stderr.write(`Retry after: ${error.retryAfterSeconds}s\n`);
    }
  } else if (error instanceof Error) {
    process.stderr.write(`${error.name}: ${error.message}\n`);
  } else {
    process.stderr.write(`Unknown error\n`);
  }

  process.exit(exitCode);
});
