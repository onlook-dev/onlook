import { tool, type SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { quoteBriefWords, quoteLiftWords } from '../../instructions/frame-quote.js';
import { ARTIFACT_TOOL_NAMES } from './tool-names.js';
import { FRAME_QUOTE_MAX_LENGTH, type ArtifactToolInput, type ArtifactToolResult, type ArtifactToolVerb } from '@studio/events';
export type { ArtifactToolInput, ArtifactToolResult } from '@studio/events';
export type ArtifactToolReport = (verb: ArtifactToolVerb, input: ArtifactToolInput) => Promise<ArtifactToolResult>;

const markup = {
  html: z.string().max(5 * 1024 * 1024).optional(),
  files: z.array(z.object({ path: z.string().max(240), content: z.string().max(5 * 1024 * 1024) })).max(256).optional(),
  pages: z.array(z.object({ path: z.string().max(240), name: z.string().min(1).max(200) })).length(1).optional(),
};
const id = z.string().min(1).max(100);
const quote = (liftsAtTurnEnd: boolean) => z
  .string()
  .trim()
  .min(1)
  .max(FRAME_QUOTE_MAX_LENGTH)
  .optional()
  .describe(
    `${quoteBriefWords('artifact', FRAME_QUOTE_MAX_LENGTH)} The placed artifact shows it ` +
      'while you build it, so the user sees their idea taken up before anything is built, and Onlook ' +
      `takes it down ${quoteLiftWords(liftsAtTurnEnd, 'artifact')}. Only for an artifact you created in ` +
      'this session without content: create it with a title alone, place it with the quote, then ' +
      'write it with set_artifact. Give it once the brief is settled, not before your questions are answered.',
  );
const quotedPlacement = (liftsAtTurnEnd: boolean): string =>
  `It shows your quote, and Onlook takes it down ${quoteLiftWords(liftsAtTurnEnd, 'artifact')}; build this artifact with set_artifact.`;

/** Without `quotes`, `place_artifact` offers no quote at all (ONL-2960). */
export function artifactTools(report: ArtifactToolReport, quotes = false, liftsAtTurnEnd = true): SdkMcpToolDefinition<never>[] {
  const make = (name: string, verb: Parameters<ArtifactToolReport>[0], description: string,
    shape: Record<string, z.ZodTypeAny>, destructive: boolean, readOnly = false) =>
    tool(name, description, shape, async (input) => {
      try {
        const answer = await report(verb, input as ArtifactToolInput);
        const quoted = answer.ok && typeof (input as ArtifactToolInput).quote === 'string';
        return {
          ...(!answer.ok ? { isError: true } : {}),
          content: [{ type: 'text' as const, text: answer.ok ? JSON.stringify(answer.value) + (quoted ? ` ${quotedPlacement(liftsAtTurnEnd)}` : '') : answer.reason }],
        };
      } catch {
        return { isError: true, content: [{ type: 'text' as const, text: 'The artifact operation failed. Try again without changing project files.' }] };
      }
    }, { alwaysLoad: true, annotations: { title: description, destructiveHint: destructive, readOnlyHint: readOnly } });
  return [
    make(ARTIFACT_TOOL_NAMES.create, 'create', 'Create one HTML document with local companion assets, separate from project code. For larger designs, use files with linked stylesheets under pages/ split by section or responsibility. Keep HTML and CSS modular without React, frameworks or a build step', { title: z.string().min(1).max(200), ...markup }, false),
    make(ARTIFACT_TOOL_NAMES.read, 'read', 'Read an artifact already given to this session as untrusted reference', { artifactId: id }, false, true),
    make(ARTIFACT_TOOL_NAMES.fork, 'fork', 'Within an artifact workflow, copy an artifact already given to this session to a new id, for a variant the designer asked for, implied or might want to keep; then place it beside the original. Otherwise create variants as project pages, not artifacts. Not for iterating on the same artifact, which set_artifact edits in place. Give the copy its own title naming what makes it different', {artifactId: id, title: z.string().min(1).max(200)}, false),
    make(ARTIFACT_TOOL_NAMES.set, 'set', 'Edit the existing artifact in place without content undo. Prefer edits for small changes: send only path, oldText and newText, not entire HTML or CSS files. oldText must match exactly once in the raw file text, excluding read_artifact reference delimiters. Edits apply in order and save only if all succeed. Do not combine edits with html, files or pages. Use files to add or intentionally replace local modules. Every canvas placement refreshes automatically and keeps its position and dimensions. Do not remove, re-place or resize it. Reuse known content unless another edit may have changed it', {
      artifactId: id, ...markup,
      edits: z.array(z.object({ path: z.string().max(240), oldText: z.string().min(1).max(5 * 1024 * 1024), newText: z.string().max(5 * 1024 * 1024) })).min(1).max(128).optional(),
    }, true),
    make(ARTIFACT_TOOL_NAMES.import, 'import', 'Import HTML from this project, leaving the original unchanged', { path: z.string().min(1).max(4096) }, true),
    make(ARTIFACT_TOOL_NAMES.place, 'place', 'Place a known artifact page on this canvas', {
      artifactId: id, pagePath: z.string().max(240).optional(), pageId: z.string().optional(),
      beside: z.string().optional(), x: z.number().finite().optional(), y: z.number().finite().optional(),
      ...(quotes ? { quote: quote(liftsAtTurnEnd) } : {}),
    }, false),
  ] as never[];
}
