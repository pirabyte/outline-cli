import { getFlagNumber, getFlagString } from "../../core/args.js";
import { parseNullableString } from "../../core/utils.js";
import type { CommandContext, CommandExecution } from "./shared.js";
import { getDocumentId, maybeCheckUpdatedAtGuard } from "./shared.js";

export async function runPageMove(ctx: CommandContext): Promise<CommandExecution> {
  const id = getDocumentId(ctx.args);
  await maybeCheckUpdatedAtGuard(ctx, id);

  const request: Record<string, unknown> = { id };
  const collectionId = parseNullableString(getFlagString(ctx.args, "collection-id"));
  const parentDocumentId = parseNullableString(getFlagString(ctx.args, "parent-id"));
  const index = getFlagNumber(ctx.args, "index");

  if (collectionId !== undefined) request.collectionId = collectionId;
  if (parentDocumentId !== undefined) request.parentDocumentId = parentDocumentId;
  if (index !== undefined) request.index = index;

  const response = await ctx.client.post("documents.move", request);
  return { method: "documents.move", request, response };
}

