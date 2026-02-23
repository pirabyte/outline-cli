import { OutlineApiError } from "./errors.js";
import type { OutlineRpcEnvelope } from "../types/outline.js";

export interface OutlineClientOptions {
  baseUrl: string;
  apiKey: string;
  userAgent?: string;
}

export class OutlineClient {
  private readonly baseApiUrl: string;
  private readonly apiKey: string;
  private readonly userAgent: string;

  constructor(options: OutlineClientOptions) {
    this.baseApiUrl = `${options.baseUrl.replace(/\/+$/, "")}/api`;
    this.apiKey = options.apiKey;
    this.userAgent = options.userAgent ?? "outline-cli/0.1.0";
  }

  async post<T>(method: string, body: Record<string, unknown> = {}): Promise<OutlineRpcEnvelope<T>> {
    const response = await fetch(`${this.baseApiUrl}/${method}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": this.userAgent,
      },
      body: JSON.stringify(body),
    });

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new OutlineApiError(formatApiErrorMessage(response.status, payload), {
        statusCode: response.status,
        responseBody: payload,
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      });
    }

    if (payload && typeof payload === "object" && "ok" in (payload as Record<string, unknown>)) {
      const ok = (payload as Record<string, unknown>).ok;
      if (ok === false) {
        throw new OutlineApiError(formatApiErrorMessage(response.status, payload), {
          statusCode: response.status,
          responseBody: payload,
          retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
        });
      }
    }

    return payload as OutlineRpcEnvelope<T>;
  }
}

function formatApiErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = typeof record.message === "string"
      ? record.message
      : typeof record.error === "string"
        ? record.error
        : undefined;
    if (message) {
      return `Outline API error (${status}): ${message}`;
    }
  }
  if (typeof payload === "string" && payload.trim()) {
    return `Outline API error (${status}): ${payload.trim()}`;
  }
  return `Outline API error (${status})`;
}

