import type { OutlineDocument, OutlineRpcEnvelope } from "../types/outline.js";

export interface CommandOutput {
  command: string;
  method: string;
  request: Record<string, unknown>;
  response: unknown;
}

export function printOutput(output: CommandOutput, options: { json: boolean; quiet?: boolean }): void {
  if (options.json) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      command: output.command,
      method: output.method,
      request: output.request,
      response: output.response,
      timestamp: new Date().toISOString(),
    }, null, 2)}\n`);
    return;
  }

  if (options.quiet) {
    const maybeDoc = extractSingleDocument(output.response);
    if (maybeDoc?.id) {
      process.stdout.write(`${maybeDoc.id}\n`);
      return;
    }
  }

  process.stdout.write(formatHuman(output));
}

function formatHuman(output: CommandOutput): string {
  const lines: string[] = [];
  lines.push(`${output.command} -> ${output.method}`);

  const maybeEnvelope = output.response as OutlineRpcEnvelope<unknown>;
  if (Array.isArray(maybeEnvelope?.data)) {
    lines.push(`items: ${maybeEnvelope.data.length}`);
    for (const item of maybeEnvelope.data.slice(0, 10)) {
      if (isDocument(item)) {
        lines.push(`- ${item.id} | ${item.title ?? "(untitled)"}`);
      } else {
        lines.push(`- ${summarize(item)}`);
      }
    }
    if (maybeEnvelope.pagination) {
      const { limit, offset, nextPath } = maybeEnvelope.pagination;
      lines.push(`pagination: limit=${limit ?? "?"} offset=${offset ?? "?"}${nextPath ? " nextPath=yes" : ""}`);
    }
    return `${lines.join("\n")}\n`;
  }

  if (maybeEnvelope && typeof maybeEnvelope === "object" && "data" in maybeEnvelope) {
    const data = maybeEnvelope.data as unknown;
    if (isDocument(data)) {
      lines.push(`id: ${data.id}`);
      lines.push(`title: ${data.title ?? "(untitled)"}`);
      if (data.urlId) lines.push(`urlId: ${data.urlId}`);
      if (data.collectionId) lines.push(`collectionId: ${data.collectionId}`);
      if (data.parentDocumentId) lines.push(`parentDocumentId: ${data.parentDocumentId}`);
      if (data.updatedAt) lines.push(`updatedAt: ${data.updatedAt}`);
      return `${lines.join("\n")}\n`;
    }

    lines.push(summarize(data));
    return `${lines.join("\n")}\n`;
  }

  lines.push(summarize(output.response));
  return `${lines.join("\n")}\n`;
}

function extractSingleDocument(response: unknown): OutlineDocument | undefined {
  if (!response || typeof response !== "object") return undefined;
  const record = response as Record<string, unknown>;
  if (!("data" in record)) return undefined;
  const data = record.data;
  return isDocument(data) ? data : undefined;
}

function isDocument(value: unknown): value is OutlineDocument {
  return Boolean(value && typeof value === "object" && typeof (value as Record<string, unknown>).id === "string");
}

function summarize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

