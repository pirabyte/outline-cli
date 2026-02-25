import type { ParsedArgs } from "../core/args.js";
import { hasFlag } from "../core/args.js";
import { createCredentialStore, type CredentialStore } from "../core/credential-store.js";
import { CliUsageError } from "../core/errors.js";

export interface RootCommandExecution {
  method: string;
  request: Record<string, unknown>;
  response: unknown;
}

export async function runLogoutCommand(
  args: ParsedArgs,
  deps?: { credentialStore?: CredentialStore }
): Promise<RootCommandExecution> {
  if (hasFlag(args, "help")) {
    throw new CliUsageError(logoutHelp());
  }

  const credentialStore = deps?.credentialStore ?? createCredentialStore();
  await credentialStore.clearDefault();

  return {
    method: "auth.logout.clear",
    request: {},
    response: {
      ok: true,
      cleared: true,
      stored: "keychain",
    },
  };
}

export function logoutHelp(): string {
  return [
    "Logout command:",
    "  outline logout [--json]",
    "",
    "Removes stored default credentials from the OS keychain and local auth metadata.",
  ].join("\n");
}
