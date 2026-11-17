import type { ReactNode } from 'react';
import type { ShortcutId } from '../../shortcuts/registry.js';
import type { StringKey } from '@studio/i18n';
import { t } from '@studio/i18n';
import {
  ArtifactToolPreview,
  FrameToolPreview,
  SectionToolPreview,
  ImageToolPreview,
  PanPreview,
  RunPreview,
  SelectPreview,
  TextToolPreview,
} from './illustrations.jsx';

export interface PreviewContext {
  running: boolean;
  hasFrames: boolean;
}

interface PreviewEntry {
  id: string;
  lines: (context: PreviewContext) => readonly [string, string?];
  shortcut?: ShortcutId;
  Content: (props: { running: boolean }) => ReactNode;
}

const oneLine = (key: StringKey) => (): readonly [string] => [t(key)];

const twoLines = (key: StringKey): readonly [string, string?] => {
  const [first = '', ...rest] = t(key).split('\n');
  return rest.length === 0 ? [first] : [first, rest.join(' ')];
};

/** Toolbar order: the slide direction between previews reads from it. */
export const PREVIEWS = [
  { id: 'select', lines: oneLine('canvas.tool.select.preview'), shortcut: 'canvas.tool-select', Content: SelectPreview },
  { id: 'pan', lines: oneLine('canvas.tool.pan.preview'), shortcut: 'canvas.tool-pan', Content: PanPreview },
  { id: 'frame', lines: oneLine('canvas.tool.frame.preview'), shortcut: 'canvas.tool-frame', Content: FrameToolPreview },
  { id: 'section', lines: oneLine('canvas.tool.section.preview'), shortcut: 'canvas.tool-section', Content: SectionToolPreview },
  { id: 'text', lines: oneLine('canvas.tool.text.preview'), shortcut: 'canvas.tool-text', Content: TextToolPreview },
  { id: 'artifact', lines: oneLine('canvas.tool.artifact.preview'), shortcut: 'canvas.tool-artifact', Content: ArtifactToolPreview },
  { id: 'image', lines: oneLine('canvas.tool.image.preview'), shortcut: 'canvas.place-image', Content: ImageToolPreview },
  {
    id: 'run',
    lines: ({ running, hasFrames }: PreviewContext): readonly [string, string?] =>
      running
        ? [t('canvas.run.preview.stop')]
        : hasFrames
          ? twoLines('canvas.run.preview.start.everywhere')
          : [t('canvas.run.preview.start')],
    Content: RunPreview,
  },
] as const satisfies readonly PreviewEntry[];

export type PreviewId = (typeof PREVIEWS)[number]['id'];

export const indexOf = (id: PreviewId): number => PREVIEWS.findIndex((p) => p.id === id);

export const entryOf = (id: PreviewId): PreviewEntry => PREVIEWS[indexOf(id)];

export const PREVIEW_ATTR = 'data-preview';

export function previewIdOf(target: Element | null): PreviewId | undefined {
  const id = target?.closest(`[${PREVIEW_ATTR}]`)?.getAttribute(PREVIEW_ATTR);
  return PREVIEWS.find((p) => p.id === id)?.id;
}
