import { readFile } from "node:fs/promises";
import process from "node:process";
import { CliUsageError } from "./errors.js";
import type { ParsedArgs } from "./args.js";
import { getFlagString, hasFlag } from "./args.js";

export async function readTextInput(args: ParsedArgs): Promise<string | undefined> {
  const inline = getFlagString(args, "text");
  const file = getFlagString(args, "file");
  const useStdin = hasFlag(args, "stdin");

  const chosen = [inline !== undefined, file !== undefined, useStdin].filter(Boolean).length;
  if (chosen > 1) {
    throw new CliUsageError("Use only one of --text, --file, or --stdin");
  }

  if (inline !== undefined) return inline;
  if (file) return readFile(file, "utf8");
  if (useStdin) return readAllStdin();
  return undefined;
}

async function readAllStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new CliUsageError("--stdin was provided but no stdin is piped");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function parseNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === "null") return null;
  return value;
}

