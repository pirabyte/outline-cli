export class CliUsageError extends Error {
  readonly exitCode = 2;
}

export class OutlineApiError extends Error {
  readonly statusCode?: number;
  readonly responseBody?: unknown;
  readonly retryAfterSeconds?: number;

  constructor(message: string, options?: {
    statusCode?: number;
    responseBody?: unknown;
    retryAfterSeconds?: number;
  }) {
    super(message);
    this.name = "OutlineApiError";
    this.statusCode = options?.statusCode;
    this.responseBody = options?.responseBody;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function mapErrorToExitCode(error: unknown): number {
  if (error instanceof CliUsageError) {
    return error.exitCode;
  }
  if (error instanceof OutlineApiError) {
    if (error.statusCode === 401 || error.statusCode === 403) return 3;
    if (error.statusCode === 404) return 4;
    if (error.statusCode === 429) return 6;
    return 1;
  }
  return 1;
}

