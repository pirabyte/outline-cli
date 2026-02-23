import { getFlagBoolean } from "../../core/args.js";
import type { CommandContext, CommandExecution } from "./shared.js";
import { getDocumentId, maybeCheckUpdatedAtGuard } from "./shared.js";

export async function runPageDelete(ctx: CommandContext): Promise<CommandExecution> {
  const id = getDocumentId(ctx.args);
  await maybeCheckUpdatedAtGuard(ctx, id);
  const permanent = getFlagBoolean(ctx.args, "permanent");
  const request: Record<string, unknown> = { id };
  if (permanent !== undefined) request.permanent = permanent;
  const response = await ctx.client.post("documents.delete", request);
  return { method: "documents.delete", request, response };
}

