import type { CommandContext, CommandExecution } from "./shared.js";
import { getDocumentId, maybeCheckUpdatedAtGuard } from "./shared.js";

export async function runPageArchive(ctx: CommandContext): Promise<CommandExecution> {
  const id = getDocumentId(ctx.args);
  await maybeCheckUpdatedAtGuard(ctx, id);
  const request = { id };
  const response = await ctx.client.post("documents.archive", request);
  return { method: "documents.archive", request, response };
}

