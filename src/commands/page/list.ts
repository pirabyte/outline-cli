import { getFlagNumber, getFlagString, getFlagStringArray } from "../../core/args.js";
import { parseNullableString } from "../../core/utils.js";
import type { CommandContext, CommandExecution } from "./shared.js";

export async function runPageList(ctx: CommandContext): Promise<CommandExecution> {
  const request: Record<string, unknown> = {};
  const limit = getFlagNumber(ctx.args, "limit");
  const offset = getFlagNumber(ctx.args, "offset");
  const collectionId = getFlagString(ctx.args, "collection-id");
  const userId = getFlagString(ctx.args, "user-id");
  const backlinkDocumentId = getFlagString(ctx.args, "backlink-document-id");
  const parentDocumentId = parseNullableString(getFlagString(ctx.args, "parent-id"));
  const statusFilter = getFlagStringArray(ctx.args, "status");
  const sort = getFlagString(ctx.args, "sort");
  const direction = getFlagString(ctx.args, "direction");

  if (limit !== undefined) request.limit = limit;
  if (offset !== undefined) request.offset = offset;
  if (collectionId) request.collectionId = collectionId;
  if (userId) request.userId = userId;
  if (backlinkDocumentId) request.backlinkDocumentId = backlinkDocumentId;
  if (parentDocumentId !== undefined) request.parentDocumentId = parentDocumentId;
  if (statusFilter?.length) request.statusFilter = statusFilter;
  if (sort) request.sort = sort;
  if (direction) request.direction = direction;

  const response = await ctx.client.post("documents.list", request);
  return { method: "documents.list", request, response };
}

