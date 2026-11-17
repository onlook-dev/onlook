import type { StringKey, StringParams } from '@studio/i18n';
import { artifactTags } from '@studio/events';
export { artifactTag, artifactTags } from '@studio/events';

/** `t`'s shape, which naming needs with params since a shared title composes one (ONL-2568). */
export type Translate = (key: StringKey, params?: StringParams) => string;

/** What naming a node needs, per kind. The Designs row and the composer chip both read this, so neither can drift (ONL-2486). */
export type CanvasNodeLabelFacts =
  | { kind: 'browser'; name: string }
  | { kind: 'text'; name: string; text: string }
  | { kind: 'image'; name: string }
  | { kind: 'section'; name: string }
  | { kind: 'artifact'; name: string; title: string; artifactId: string };

export type CanvasNodeLabel =
  | { source: 'given' | 'text' | 'artifact-title'; value: string }
  | { source: 'untitled' | 'pasted-image'; key: StringKey };

/** A leading blank line is not the line a reader means. */
function firstWrittenLine(text: string): string | undefined {
  return text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '');
}

export function canvasNodeLabel(facts: CanvasNodeLabelFacts): CanvasNodeLabel {
  // An artifact has one name, its own title; a node's alias never shows beside it (ONL-2593).
  if (facts.kind === 'artifact' && facts.title.trim() !== '') return {source: 'artifact-title', value: facts.title};
  if (facts.name.trim() !== '') return { source: 'given', value: facts.name };
  switch (facts.kind) {
    case 'section':
      return { source: 'untitled', key: 'canvas.section.defaultName' };
    case 'text': {
      const line = firstWrittenLine(facts.text);
      return line === undefined
        ? { source: 'untitled', key: 'sidebar.text.untitled' }
        : { source: 'text', value: line };
    }
    case 'image':
      return { source: 'pasted-image', key: 'canvas.image.pastedName' };
    case 'artifact':
      // The manifest's title, carried on the node as a display copy (ONL-2568).
      return facts.title.trim() === ''
        ? { source: 'untitled', key: 'canvas.artifact.untitled' }
        : { source: 'artifact-title', value: facts.title };
    /* The one path nothing owns — a hand-edited document file — so a row cannot
       render as an unclickable sliver. */
    case 'browser':
      return { source: 'untitled', key: 'sidebar.frame.untitled' };
  }
}

/** Resolves the union so a caller never reaches for `'value' in label`. */
export function canvasNodeLabelText(facts: CanvasNodeLabelFacts, translate: Translate): string {
  const label = canvasNodeLabel(facts);
  return 'value' in label ? label.value : translate(label.key);
}

/**
 * Naming reads the set, because a title alone can be held twice: two sketches that
 * resolve to one label each show their own tag, and a label held once never does (ONL-2568).
 */
export function canvasNodeLabeller(
  among: readonly CanvasNodeLabelFacts[],
  translate: Translate,
  artifactTitles?: ReadonlyMap<string, string>,
): (facts: CanvasNodeLabelFacts) => string {
  const current = (facts: CanvasNodeLabelFacts): CanvasNodeLabelFacts => facts.kind === 'artifact' && artifactTitles?.has(facts.artifactId) ? {...facts, title: artifactTitles.get(facts.artifactId)!} : facts;
  const holders = new Map<string, Set<string>>();
  for (const facts of among) {
    if (facts.kind !== 'artifact') continue;
    const text = canvasNodeLabelText(current(facts), translate);
    const ids = holders.get(text) ?? new Set<string>();
    ids.add(facts.artifactId);
    holders.set(text, ids);
  }
  // Two nodes of one artifact are one sketch, so a set of one identity wears no tag.
  const tagged = new Map<string, Map<string, string>>();
  for (const [text, ids] of holders) {
    if (ids.size < 2) continue;
    tagged.set(text, artifactTags(ids));
  }
  return (facts) => {
    const text = canvasNodeLabelText(current(facts), translate);
    if (facts.kind !== 'artifact') return text;
    const tag = tagged.get(text)?.get(facts.artifactId);
    if (tag === undefined) return text;
    return translate('canvas.artifact.sharedTitle', { label: text, tag });
  };
}
