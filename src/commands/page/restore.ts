import { getFlagString } from "../../core/args.js";
import type { CommandContext, CommandExecution } from "./shared.js";
import { getDocumentId } from "./shared.js";

export async function runPageRestore(ctx: CommandContext): Promise<CommandExecution> {
  const id = getDocumentId(ctx.args);
  const collectionId = getFlagString(ctx.args, "collection-id");
  const revisionId = getFlagString(ctx.args, "revision-id");
  const request: Record<string, unknown> = { id };
  if (collectionId) request.collectionId = collectionId;
  if (revisionId) request.revisionId = revisionId;
  const response = await ctx.client.post("documents.restore", request);
  return { method: "documents.restore", request, response };
}

