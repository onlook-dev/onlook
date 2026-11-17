import { z } from 'zod';
import { canvasSinksFrom } from '../canvas-tools.js';
import { studioToolDefinitions, type StudioToolSinks } from '../studio-tools.js';
import { STUDIO_TOOL_NAMES, STUDIO_TOOLS } from '../tool-names.js';

/** The exact inverse of `STUDIO_AUTO_APPROVED_TOOLS`. Membership is not the whole answer: `onHostTool` also runs the two setup tools unasked while a project has no verified setup (ONL-2499). */
export const APPSERVER_APPROVAL_TOOLS: readonly string[] = STUDIO_TOOL_NAMES.filter(
  (name) => STUDIO_TOOLS[name].approval !== 'auto',
);

export const APPSERVER_WITHHELD_TOOLS: readonly string[] = [];

export interface DynamicToolSpec {
  readonly type: 'function';
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly deferLoading: false;
}

export type DynamicToolContentItem =
  | { type: 'inputText'; text: string }
  | { type: 'inputImage'; imageUrl: string };

export interface DynamicToolResult {
  success: boolean;
  contentItems: DynamicToolContentItem[];
}

interface StudioDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  annotations?: { title?: string };
  handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;
}

function definitions(sinks: StudioToolSinks): StudioDefinition[] {
  return (studioToolDefinitions(sinks) as unknown as StudioDefinition[]).filter(
    (definition) => !APPSERVER_WITHHELD_TOOLS.includes(definition.name),
  );
}

/** codex's schema parser rejects `$schema` and requires `additionalProperties: false`. */
function jsonSchema(shape: Record<string, z.ZodTypeAny>): Record<string, unknown> {
  const converted = z.toJSONSchema(z.object(shape), { io: 'input' }) as Record<string, unknown>;
  delete converted['$schema'];
  return { ...converted, type: 'object', additionalProperties: false };
}

export function appServerToolSpecs(sinks: StudioToolSinks): DynamicToolSpec[] {
  return definitions(sinks).map((definition) => ({
    type: 'function' as const,
    name: definition.name,
    description: definition.description,
    inputSchema: jsonSchema(definition.inputSchema),
    deferLoading: false as const,
  }));
}

export function appServerToolTitles(sinks: StudioToolSinks): Record<string, string> {
  const titles: Record<string, string> = {};
  for (const definition of definitions(sinks)) {
    const title = definition.annotations?.title;
    if (title !== undefined) titles[definition.name] = title;
  }
  return titles;
}

export function appServerToolNames(sinks: StudioToolSinks): string[] {
  return definitions(sinks).map((definition) => definition.name);
}

/** An http(s) `imageUrl` makes codex discard the whole result; only a `data:` URI travels. */
export function toContentItems(result: unknown): DynamicToolContentItem[] {
  const content = (result as { content?: unknown } | undefined)?.content;
  if (!Array.isArray(content)) {
    return [{ type: 'inputText', text: typeof result === 'string' ? result : JSON.stringify(result) }];
  }
  const items: DynamicToolContentItem[] = [];
  for (const block of content) {
    const record = block as { type?: unknown; text?: unknown; data?: unknown; mimeType?: unknown };
    if (record.type === 'text' && typeof record.text === 'string') {
      items.push({ type: 'inputText', text: record.text });
      continue;
    }
    if (record.type === 'image' && typeof record.data === 'string') {
      const mime = typeof record.mimeType === 'string' ? record.mimeType : 'image/png';
      items.push({ type: 'inputImage', imageUrl: `data:${mime};base64,${record.data}` });
    }
  }
  return items;
}

export function appServerToolRunner(
  sinks: StudioToolSinks,
): (tool: string, args: unknown) => Promise<DynamicToolResult> {
  const byName = new Map(definitions(sinks).map((definition) => [definition.name, definition]));
  return async (tool, args) => {
    const definition = byName.get(tool);
    if (definition === undefined) {
      return {
        success: false,
        contentItems: [{ type: 'inputText', text: `Onlook has no tool called '${tool}'.` }],
      };
    }
    try {
      const result = await definition.handler((args ?? {}) as Record<string, unknown>, {});
      const isError = (result as { isError?: boolean } | undefined)?.isError === true;
      return { success: !isError, contentItems: toContentItems(result) };
    } catch (error) {
      return {
        success: false,
        contentItems: [
          { type: 'inputText', text: `Onlook's ${tool} failed: ${(error as Error).message}` },
        ],
      };
    }
  };
}

export function inertToolSinks(): StudioToolSinks {
  const nope = (): Promise<never> => Promise.reject(new Error('inert sinks have no canvas'));
  return {
    ...canvasSinksFrom(() => nope),
    projectSetup: { read: () => { throw new Error('inert sinks have no project'); }, save: () => { throw new Error('inert sinks have no project'); }, run: nope },
    onServerRunning: () => undefined,
    onFrameWorking: () => undefined,
    onWaitingOn: () => undefined,
    onSuggestNextTasks: () => undefined,
    onClipNextTaskPictures: (_frameId, targets) => Promise.resolve(targets.map(() => ({ ok: false as const, reason: 'project-closed' as const }))),
    onFrameUrl: nope,
    onRenameProject: nope,
    onCreateProjectTab: nope,
    onArtifact: nope,
  };
}
