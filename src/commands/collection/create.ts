import { getFlagBoolean, getFlagString } from "../../core/args.js";
import { parseNullableString } from "../../core/utils.js";
import type { CommandContext, CommandExecution } from "./shared.js";

export async function runCollectionCreate(ctx: CommandContext): Promise<CommandExecution> {
  const request: Record<string, unknown> = {};
  const name = getFlagString(ctx.args, "name");
  const description = parseNullableString(getFlagString(ctx.args, "description"));
  const permission = getFlagString(ctx.args, "permission");
  const privateCollection = getFlagBoolean(ctx.args, "private");
  const color = parseNullableString(getFlagString(ctx.args, "color"));
  const icon = parseNullableString(getFlagString(ctx.args, "icon"));

  if (name !== undefined) request.name = name;
  if (description !== undefined) request.description = description;
  if (permission !== undefined) request.permission = permission;
  if (privateCollection !== undefined) request.private = privateCollection;
  if (color !== undefined) request.color = color;
  if (icon !== undefined) request.icon = icon;

  const response = await ctx.client.post("collections.create", request);
  return { method: "collections.create", request, response };
}
