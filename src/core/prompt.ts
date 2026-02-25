import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import { CliUsageError } from "./errors.js";

export async function promptLine(label: string): Promise<string> {
  ensureInteractiveTty();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const value = await rl.question(label);
    return value.trim();
  } finally {
    rl.close();
  }
}

export async function promptSecret(label: string): Promise<string> {
  ensureInteractiveTty();

  return new Promise<string>((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = Boolean((stdin as typeof stdin & { isRaw?: boolean }).isRaw);
    let buffer = "";

    const cleanup = () => {
      stdin.off("keypress", onKeypress);
      if (stdin.isTTY && !wasRaw) {
        stdin.setRawMode(false);
      }
      stdout.write("\n");
    };

    const fail = (error: unknown) => {
      cleanup();
      reject(error);
    };

    const onKeypress = (str: string, key: readline.Key) => {
      if (key.ctrl && key.name === "c") {
        fail(new CliUsageError("Prompt cancelled"));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(buffer.trim());
        return;
      }

      if (key.name === "backspace") {
        buffer = buffer.slice(0, -1);
        return;
      }

      if (key.sequence && !key.ctrl && !key.meta && str) {
        buffer += str;
      }
    };

    readline.emitKeypressEvents(stdin);
    stdout.write(label);
    stdin.resume();
    if (stdin.isTTY && !wasRaw) {
      stdin.setRawMode(true);
    }
    stdin.on("keypress", onKeypress);
  });
}

function ensureInteractiveTty(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliUsageError(
      "Interactive prompts require a TTY. Pass --base-url and --api-key (or use env vars) instead."
    );
  }
}
