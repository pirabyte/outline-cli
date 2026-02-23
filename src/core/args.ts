import { CliUsageError } from "./errors.js";

export type FlagValue = string | boolean | string[];

export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, FlagValue>;
}

export function parseArgv(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const withoutPrefix = token.slice(2);
    if (!withoutPrefix) {
      throw new CliUsageError("Invalid flag syntax: '--'");
    }

    if (withoutPrefix.startsWith("no-")) {
      setFlag(flags, withoutPrefix.slice(3), false);
      continue;
    }

    const eqIndex = withoutPrefix.indexOf("=");
    if (eqIndex >= 0) {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      setFlag(flags, key, value);
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      setFlag(flags, withoutPrefix, next);
      i += 1;
      continue;
    }

    setFlag(flags, withoutPrefix, true);
  }

  return { positionals, flags };
}

function setFlag(flags: Record<string, FlagValue>, key: string, value: string | boolean): void {
  const current = flags[key];
  if (current === undefined) {
    flags[key] = value;
    return;
  }
  if (Array.isArray(current)) {
    current.push(String(value));
    return;
  }
  flags[key] = [String(current), String(value)];
}

export function hasFlag(args: ParsedArgs, key: string): boolean {
  const value = args.flags[key];
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  return true;
}

export function getFlagString(args: ParsedArgs, key: string): string | undefined {
  const value = args.flags[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[value.length - 1];
  if (typeof value === "boolean") return value ? "true" : "false";
  return value;
}

export function getRequiredString(args: ParsedArgs, key: string, message?: string): string {
  const value = getFlagString(args, key);
  if (!value) {
    throw new CliUsageError(message ?? `Missing required flag --${key}`);
  }
  return value;
}

export function getFlagBoolean(args: ParsedArgs, key: string): boolean | undefined {
  const value = args.flags[key];
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return parseBoolean(value[value.length - 1], key);
  }
  return parseBoolean(value, key);
}

export function getFlagNumber(args: ParsedArgs, key: string): number | undefined {
  const value = getFlagString(args, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliUsageError(`Flag --${key} must be a number`);
  }
  return parsed;
}

export function getFlagStringArray(args: ParsedArgs, key: string): string[] | undefined {
  const value = args.flags[key];
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : [String(value)];
  return list
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(raw: string, key: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  throw new CliUsageError(`Flag --${key} must be a boolean`);
}

