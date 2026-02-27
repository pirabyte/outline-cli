import type { CommandContext, CommandExecution } from "./shared.js";
import { getCollectionId } from "./shared.js";

export async function runCollectionGet(ctx: CommandContext): Promise<CommandExecution> {
  const id = getCollectionId(ctx.args);
  const request: Record<string, unknown> = { id };
  const response = await ctx.client.post("collections.info", request);
  return { method: "collections.info", request, response };
}
