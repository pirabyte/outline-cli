#!/usr/bin/env node

import process from "node:process";
import { parseArgv, getFlagBoolean, getFlagString, hasFlag } from "./core/args.js";
import { loadConfig } from "./core/config.js";
import { OutlineClient } from "./core/client.js";
import { CliUsageError, OutlineApiError, mapErrorToExitCode } from "./core/errors.js";
import { printOutput } from "./core/output.js";
import { runPageCommand, pageHelp } from "./commands/page/index.js";

async function main(): Promise<void> {
  const args = parseArgv(process.argv.slice(2));

  if (args.positionals.length === 0 || hasFlag(args, "help")) {
    throw new CliUsageError(rootHelp());
  }

  const rootCommand = args.positionals[0];
  const jsonFlag = getFlagBoolean(args, "json");
  const quietFlag = getFlagBoolean(args, "quiet");
  const config = loadConfig({
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
    case "help":
      throw new CliUsageError(rootHelp());
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

function rootHelp(): string {
  return [
    "Outline CLI (MVP)",
    "",
    "Required auth config:",
    "  --base-url https://your-outline.example.com",
    "  --api-key <token>",
    "  or env vars: OUTLINE_BASE_URL / OUTLINE_API_KEY",
    "",
    "Global flags:",
    "  --json            JSON output",
    "  --quiet           Minimal output",
    "  --dry-run         Preview command mapping (MVP)",
    "  --profile NAME    Reserved (not implemented yet)",
    "  --help",
    "",
    "Commands:",
    "  outline page <subcommand> [options]",
    "",
    pageHelp(),
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

