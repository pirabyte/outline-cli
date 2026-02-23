import type { CommandContext, CommandExecution } from "./shared.js";
import { getDocumentId } from "./shared.js";

export async function runPageGet(ctx: CommandContext): Promise<CommandExecution> {
  const id = getDocumentId(ctx.args);
  const request = { id };
  const response = await ctx.client.post("documents.info", request);
  return { method: "documents.info", request, response };
}

