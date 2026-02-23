import { getFlagBoolean, getFlagNumber, getFlagString } from "../../core/args.js";
import { readTextInput, parseNullableString } from "../../core/utils.js";
import type { CommandContext, CommandExecution } from "./shared.js";

export async function runPageCreate(ctx: CommandContext): Promise<CommandExecution> {
  const request: Record<string, unknown> = {};
  const title = getFlagString(ctx.args, "title");
  const text = await readTextInput(ctx.args);
  const id = getFlagString(ctx.args, "id");
  const collectionId = parseNullableString(getFlagString(ctx.args, "collection-id"));
  const parentDocumentId = parseNullableString(getFlagString(ctx.args, "parent-id"));
  const publish = getFlagBoolean(ctx.args, "publish");
  const icon = getFlagString(ctx.args, "icon");
  const color = parseNullableString(getFlagString(ctx.args, "color"));
  const fullWidth = getFlagBoolean(ctx.args, "full-width");
  const index = getFlagNumber(ctx.args, "index");
  const templateId = getFlagString(ctx.args, "template-id");
  const createdAt = getFlagString(ctx.args, "created-at");

  if (id) request.id = id;
  if (title !== undefined) request.title = title;
  if (text !== undefined) request.text = text;
  if (collectionId !== undefined) request.collectionId = collectionId;
  if (parentDocumentId !== undefined) request.parentDocumentId = parentDocumentId;
  if (publish !== undefined) request.publish = publish;
  if (icon !== undefined) request.icon = icon;
  if (color !== undefined) request.color = color;
  if (fullWidth !== undefined) request.fullWidth = fullWidth;
  if (index !== undefined) request.index = index;
  if (templateId !== undefined) request.templateId = templateId;
  if (createdAt !== undefined) request.createdAt = createdAt;

  const response = await ctx.client.post("documents.create", request);
  return { method: "documents.create", request, response };
}

