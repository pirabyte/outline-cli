import { getFlagBoolean, getFlagString } from "../../core/args.js";
import { CliUsageError } from "../../core/errors.js";
import { parseNullableString, readTextInput } from "../../core/utils.js";

import type { OutlineDocument } from "../../types/outline.js";
import type { CommandContext, CommandExecution } from "./shared.js";

import { getDocumentId, maybeCheckUpdatedAtGuard } from "./shared.js";

export async function runPageUpdate(ctx: CommandContext): Promise<CommandExecution> {
  return runPageUpdateWithMode(ctx, "replace");
}

export async function runPageAppend(ctx: CommandContext): Promise<CommandExecution> {
  return runPageUpdateWithMode(ctx, "append");
}

export async function runPagePrepend(ctx: CommandContext): Promise<CommandExecution> {
  return runPageUpdateWithMode(ctx, "prepend");
}

type EditMode = "replace" | "append" | "prepend";

async function runPageUpdateWithMode(ctx: CommandContext, mode: EditMode): Promise<CommandExecution> {
  const id = getDocumentId(ctx.args);
  await maybeCheckUpdatedAtGuard(ctx, id);

  const request: Record<string, unknown> = { id };
  const title = getFlagString(ctx.args, "title");
  const text = await readTextInput(ctx.args);
  const icon = parseNullableString(getFlagString(ctx.args, "icon"));
  const color = parseNullableString(getFlagString(ctx.args, "color"));
  const collectionId = parseNullableString(getFlagString(ctx.args, "collection-id"));
  const templateId = parseNullableString(getFlagString(ctx.args, "template-id"));
  const fullWidth = getFlagBoolean(ctx.args, "full-width");
  const insightsEnabled = getFlagBoolean(ctx.args, "insights-enabled");
  const publish = getFlagBoolean(ctx.args, "publish");
  const done = getFlagBoolean(ctx.args, "done");

  if (title !== undefined) request.title = title;
  if (mode === "replace") {
    if (text !== undefined) request.text = text;
  } else {
    if (text === undefined) {
      throw new CliUsageError(`Missing text input for page ${mode}. Use --text, --file, or --stdin.`);
    }
    const currentText = await getCurrentDocumentText(ctx, id);
    request.text = mode === "append" ? `${currentText}${text}` : `${text}${currentText}`;
  }
  if (icon !== undefined) request.icon = icon;
  if (color !== undefined) request.color = color;
  if (collectionId !== undefined) request.collectionId = collectionId;
  if (templateId !== undefined) request.templateId = templateId;
  if (fullWidth !== undefined) request.fullWidth = fullWidth;
  if (insightsEnabled !== undefined) request.insightsEnabled = insightsEnabled;
  if (publish !== undefined) request.publish = publish;
  if (done !== undefined) request.done = done;

  if (mode === "replace") {
    const explicitEditMode = getFlagString(ctx.args, "edit-mode");
    if (explicitEditMode) request.editMode = explicitEditMode;
  }

  const response = await ctx.client.post("documents.update", request);
  return { method: "documents.update", request, response };
}

async function getCurrentDocumentText(ctx: CommandContext, id: string): Promise<string> {
  const info = await ctx.client.post<OutlineDocument>("documents.info", { id });
  const text = info.data?.text;
  return typeof text === "string" ? text : "";
}
