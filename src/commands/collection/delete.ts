import type { CommandContext, CommandExecution } from "./shared.js";
import { getCollectionId } from "./shared.js";

export async function runCollectionDelete(ctx: CommandContext): Promise<CommandExecution> {
  const id = getCollectionId(ctx.args);
  const request: Record<string, unknown> = { id };
  const response = await ctx.client.post("collections.delete", request);
  return { method: "collections.delete", request, response };
}
