import { getFlagNumber } from "../../core/args.js";
import type { CommandContext, CommandExecution } from "./shared.js";

export async function runCollectionList(ctx: CommandContext): Promise<CommandExecution> {
  const request: Record<string, unknown> = {};
  const limit = getFlagNumber(ctx.args, "limit");
  const offset = getFlagNumber(ctx.args, "offset");

  if (limit !== undefined) request.limit = limit;
  if (offset !== undefined) request.offset = offset;

  const response = await ctx.client.post("collections.list", request);
  return { method: "collections.list", request, response };
}
