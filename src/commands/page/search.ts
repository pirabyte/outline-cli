import { getFlagNumber, getFlagString, getFlagStringArray } from "../../core/args.js";
import { getRequiredString } from "../../core/args.js";
import type { CommandContext, CommandExecution } from "./shared.js";

function buildSearchRequest(ctx: CommandContext): Record<string, unknown> {
  const request: Record<string, unknown> = {
    query: getRequiredString(ctx.args, "query", "Missing --query"),
  };

  const limit = getFlagNumber(ctx.args, "limit");
  const offset = getFlagNumber(ctx.args, "offset");
  const userId = getFlagString(ctx.args, "user-id");
  const collectionId = getFlagString(ctx.args, "collection-id");
  const documentId = getFlagString(ctx.args, "document-id");
  const dateFilter = getFlagString(ctx.args, "date-filter");
  const shareId = getFlagString(ctx.args, "share-id");
  const sort = getFlagString(ctx.args, "sort");
  const direction = getFlagString(ctx.args, "direction");
  const statusFilter = getFlagStringArray(ctx.args, "status");

  if (limit !== undefined) request.limit = limit;
  if (offset !== undefined) request.offset = offset;
  if (userId) request.userId = userId;
  if (collectionId) request.collectionId = collectionId;
  if (documentId) request.documentId = documentId;
  if (dateFilter) request.dateFilter = dateFilter;
  if (shareId) request.shareId = shareId;
  if (sort) request.sort = sort;
  if (direction) request.direction = direction;
  if (statusFilter?.length) request.statusFilter = statusFilter;

  return request;
}

export async function runPageSearch(ctx: CommandContext): Promise<CommandExecution> {
  const request = buildSearchRequest(ctx);
  const response = await ctx.client.post("documents.search", request);
  return { method: "documents.search", request, response };
}

export async function runPageFind(ctx: CommandContext): Promise<CommandExecution> {
  const request = buildSearchRequest(ctx);
  const response = await ctx.client.post("documents.search_titles", request);
  return { method: "documents.search_titles", request, response };
}

