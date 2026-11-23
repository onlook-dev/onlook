import {
  MAX_ELEMENT_SELECTIONS,
  urlOrigin,
  withinAggregateBytes,
  type CanvasNode,
  type ElementEvidence,
} from '@studio/events';
import { canvasNodeLabeller, type CanvasNodeLabelFacts, type Translate } from '../nodeLabel.js';

export interface ElementSelection {
  evidence: ElementEvidence;
  /** Renderer-local id; main does not know it. */
  frameNodeId: string;
  stale: boolean;
}

/** Refusals the user is told about; a duplicate is not one, since ⇧-clicking a held element removes it. */
export type GatherRefusal = 'count-cap' | 'byte-cap';

export type AddOutcome = 'added' | 'already-held' | GatherRefusal;

export interface AddSelectionResult {
  /** The unchanged array on anything but `added`, so identity still reports "nothing moved". */
  selections: ElementSelection[];
  outcome: AddOutcome;
}

export function addSelection(
  selections: ElementSelection[],
  evidence: ElementEvidence,
  frameNodeId: string,
  shiftHeld: boolean,
): AddSelectionResult {
  const next: ElementSelection = { evidence, frameNodeId, stale: false };
  const refused = (outcome: AddOutcome): AddSelectionResult => ({ selections, outcome });
  // Main discards a whole batch past this, a plain pick included; this counts JSON-escaped bytes, its caps raw ones (ONL-2455).
  const admitted = (gathered: ElementSelection[]): AddSelectionResult =>
    withinAggregateBytes(selectionEvidence(gathered))
      ? { selections: gathered, outcome: 'added' }
      : refused('byte-cap');
  if (!shiftHeld) return admitted([next]);
  if (selections.some((s) => s.evidence.id === evidence.id)) return refused('already-held');
  if (selections.length >= MAX_ELEMENT_SELECTIONS) return refused('count-cap');
  return admitted([...selections, next]);
}

export function removeSelection(
  selections: ElementSelection[],
  id: string,
): ElementSelection[] {
  if (!selections.some((selection) => selection.evidence.id === id)) return selections;
  return selections.filter((s) => s.evidence.id !== id);
}

export function dropFrameSelections(
  selections: ElementSelection[],
  frameNodeId: string,
): ElementSelection[] {
  if (!selections.some((selection) => selection.frameNodeId === frameNodeId)) return selections;
  return selections.filter((s) => s.frameNodeId !== frameNodeId);
}

/** The page they were picked on is gone, and only a relocation on a page that has them can clear this (ONL-2518). */
export function staleFrameSelections(
  selections: ElementSelection[],
  frameNodeId: string,
): ElementSelection[] {
  if (!selections.some((s) => s.frameNodeId === frameNodeId && !s.stale)) return selections;
  return selections.map((s) => (s.frameNodeId === frameNodeId ? { ...s, stale: true } : s));
}

/** A followed port is the same app at a new address, so its elements move with it (ONL-2518). */
export function rehomeFrameSelections(
  selections: ElementSelection[],
  frameNodeId: string,
  frameUrl: string,
): ElementSelection[] {
  const moves = (s: ElementSelection): boolean =>
    s.frameNodeId === frameNodeId && s.evidence.frameUrl !== frameUrl;
  if (!selections.some(moves)) return selections;
  const rehomed = selections.map((s) =>
    moves(s) ? { ...s, evidence: { ...s.evidence, frameUrl } } : s,
  );
  // Evidence that grew keeps its old address rather than becoming a set the door discards whole (ONL-2455).
  return withinAggregateBytes(selectionEvidence(rehomed)) ? rehomed : selections;
}

/** Answers only for two addresses it could read; an origin it cannot name is not one it can match (ONL-2518). */
function isSameOrigin(fromUrl: string, toUrl: string): boolean {
  const from = urlOrigin(fromUrl);
  return from !== null && from === urlOrigin(toUrl);
}

/** What a frame's document is offered to re-adopt: a `domPath` that matches on another origin would hand the agent that site's element, so only the origin they were picked on gets them (ONL-2518). */
export function seedableSelectionsForFrame(
  selections: readonly ElementSelection[],
  frameNodeId: string,
  currentUrl: string | undefined,
): ElementSelection[] {
  if (currentUrl === undefined) return [];
  return selections.filter(
    (s) => s.frameNodeId === frameNodeId && isSameOrigin(s.evidence.frameUrl, currentUrl),
  );
}

export function isOriginChange(fromUrl: string, toUrl: string): boolean {
  const from = urlOrigin(fromUrl);
  const to = urlOrigin(toUrl);
  return from !== null && to !== null && from !== to;
}

export function markStale(
  selections: ElementSelection[],
  id: string,
  stale: boolean,
): ElementSelection[] {
  const selection = selections.find((candidate) => candidate.evidence.id === id);
  if (!selection || selection.stale === stale) return selections;
  return selections.map((s) => (s.evidence.id === id ? { ...s, stale } : s));
}

export function refreshSelection(
  selections: ElementSelection[],
  evidence: ElementEvidence,
): ElementSelection[] {
  const index = selections.findIndex((selection) => selection.evidence.id === evidence.id);
  if (index === -1) return selections;
  const current = selections[index];
  if (!current) return selections;
  // A re-report of the same evidence is still the guest saying it found it, which is the only
  // answer to a flag the host wrote for a page that was gone (ONL-2518).
  if (JSON.stringify(current.evidence) === JSON.stringify(evidence)) {
    return current.stale ? markStale(selections, evidence.id, false) : selections;
  }
  const refreshed = selections.map((selection, candidate) =>
    candidate === index ? { ...selection, evidence, stale: false } : selection,
  );
  // Evidence that grew: holding the stale copy beats a set the door discards whole (ONL-2455).
  return withinAggregateBytes(selectionEvidence(refreshed)) ? refreshed : selections;
}

export function selectionsForFrame(
  selections: readonly ElementSelection[],
  frameNodeId: string,
): ElementSelection[] {
  return selections.filter((s) => s.frameNodeId === frameNodeId);
}

export function selectionFrameIds(selections: readonly ElementSelection[]): string[] {
  return [...new Set(selections.map((selection) => selection.frameNodeId))];
}

export function selectionEvidence(
  selections: readonly ElementSelection[],
): ElementEvidence[] {
  return selections.map(({ evidence, stale }) => ({ ...evidence, stale }));
}

/** The whole document, never one page: reading a page turns a project-wide ambiguity into a confident wrong answer (ONL-2488). */
export function soleNodeIdNamed(
  nodes: Readonly<Record<string, CanvasNode>> | undefined,
  name: string,
): string | undefined {
  const matches = Object.values(nodes ?? {}).filter((node) => node.name === name);
  return matches.length === 1 ? matches[0]?.id : undefined;
}

/** What the composer needs off a selected node; the document's own node satisfies it through `canvasNodeFacts`. */
export interface SelectedNodeFacts {
  kind: CanvasNode['kind'];
  name: string;
  /** Resolved once: a text node's `name` is blank by design, so every surface must read this and never `name` (ONL-2486). */
  label: string;
  /** Image objects only: the blob the composer resolves bytes from (ONL-2486). */
  imageId?: string;
  artifactId?: string;
  pagePath?: string;
  /** Text objects only: what a blank name derives its label from. */
  text?: string;
}

export interface SelectedObject extends SelectedNodeFacts {
  id: string;
}

/** An explicit dispatch: a kind this build does not know must not be named as a browser node. */
export function canvasNodeLabelFacts(node: CanvasNode): CanvasNodeLabelFacts {
  switch (node.kind) {
    case 'section':
      return { kind: 'section', name: node.name };
    case 'image':
      return { kind: 'image', name: node.name };
    case 'text':
      return { kind: 'text', name: node.name, text: node.content.text };
    case 'artifact':
      return {
        kind: 'artifact',
        name: node.name,
        title: node.content.title,
        artifactId: node.content.artifactId,
      };
    case 'browser':
      return { kind: 'browser', name: node.name };
  }
}

/** `among` is every node the label is resolved against, since a title two sketches share needs its tag (ONL-2568). */
export function canvasNodeFacts(
  node: CanvasNode | undefined,
  translate: Translate,
  among: readonly CanvasNode[],
  artifactTitles?: ReadonlyMap<string, string>,
): SelectedNodeFacts | undefined {
  if (node === undefined) return undefined;
  const label = canvasNodeLabeller(among.map(canvasNodeLabelFacts), translate, artifactTitles)(
    canvasNodeLabelFacts(node),
  );
  if (node.kind === 'image') {
    return { kind: 'image', name: node.name, label, imageId: node.content.imageId };
  }
  if (node.kind === 'text') {
    return { kind: 'text', name: node.name, label, text: node.content.text };
  }
  if (node.kind === 'artifact') {
    return { kind: 'artifact', name: artifactTitles?.get(node.content.artifactId) ?? node.content.title, label, artifactId: node.content.artifactId, ...(node.content.pagePath === undefined ? {} : { pagePath: node.content.pagePath }) };
  }
  return { kind: node.kind, name: node.name, label };
}

/** The one projection the chips and the prompt both read. */
export function selectedObjects(
  selectedIds: readonly string[],
  nodeAt: (nodeId: string) => SelectedNodeFacts | undefined,
): SelectedObject[] {
  const objects: SelectedObject[] = [];
  for (const id of selectedIds) {
    const facts = nodeAt(id);
    if (facts === undefined) continue;
    objects.push({ ...facts, id });
  }
  return objects;
}

/** Frame identity rides the prompt text: `ElementEvidence` is exact-key-parsed at the main boundary, and `frameUrl` cannot tell two frames apart. */
export function selectionFrameIdentity(
  selections: readonly ElementSelection[],
  frameName: (frameNodeId: string) => string | undefined,
  selected: readonly SelectedObject[] = [],
): string {
  const label = (frameNodeId: string): string => {
    const name = frameName(frameNodeId);
    return name === undefined ? frameNodeId : `"${name}" (id ${frameNodeId})`;
  };

  const parts: string[] = [];
  const homeFrameIds = new Set<string>();
  if (selections.length > 0) {
    const byFrame = new Map<string, string[]>();
    for (const { frameNodeId, evidence } of selections) {
      const ids = byFrame.get(frameNodeId);
      if (ids) ids.push(evidence.id);
      else byFrame.set(frameNodeId, [evidence.id]);
    }
    const frames = [...byFrame.entries()];
    for (const [frameNodeId] of frames) homeFrameIds.add(frameNodeId);
    const single = frames.length === 1 ? frames[0] : undefined;
    if (single !== undefined) {
      parts.push(`The selected elements were picked in canvas frame ${label(single[0])}.`);
    } else {
      parts.push(
        [
          'The selected elements were picked in these canvas frames:',
          ...frames.map(([frameNodeId, ids]) => `- ${label(frameNodeId)}: ${ids.join(', ')}`),
        ].join('\n'),
      );
    }
  }

  const isFrame = (object: SelectedObject): boolean => object.kind === 'browser';
  // Its resolved label, never `frameName`: a text node's stored name is blank, so that would name it `""` (ONL-2486).
  const objectLabel = (object: SelectedObject): string => `"${object.label}" (id ${object.id})`;
  // Every kind names itself: the agent reads this line and acts on what it says (ONL-2486).
  const phrase = (object: SelectedObject): string => {
    switch (object.kind) {
      case 'section':
        return `the canvas section ${objectLabel(object)}`;
      case 'browser':
        return `canvas frame ${objectLabel(object)}`;
      case 'text':
        return `the canvas text object ${objectLabel(object)}`;
      case 'artifact':
        return `the canvas artifact ${objectLabel(object)}`;
      case 'image':
        return `the canvas image ${objectLabel(object)}`;
    }
  };
  const isMixed =
    homeFrameIds.size > 0 && selected.some((object) => isFrame(object) && !homeFrameIds.has(object.id));
  const singleSelected = selected.length === 1 ? selected[0] : undefined;
  if (singleSelected !== undefined) {
    parts.push(
      isMixed
        ? `The user currently has ${phrase(singleSelected)} selected — not the frame the selected elements were picked in.`
        : `The user currently has ${phrase(singleSelected)} selected.`,
    );
  } else if (selected.length > 1) {
    const listed = (object: SelectedObject): string => {
      switch (object.kind) {
        case 'section':
          return `the section ${objectLabel(object)}`;
        case 'browser':
          return objectLabel(object);
        case 'text':
          return `the text object ${objectLabel(object)}`;
        case 'artifact':
          return `the artifact ${objectLabel(object)}`;
        case 'image':
          return `the image ${objectLabel(object)}`;
      }
    };
    const named = selected.map((object) =>
      isMixed && homeFrameIds.has(object.id)
        ? `${listed(object)} (where the selected elements were picked)`
        : listed(object),
    );
    const isDisjoint = isMixed && selected.every((object) => !homeFrameIds.has(object.id));
    const these = selected.every(isFrame) ? 'these canvas frames' : 'these canvas objects';
    parts.push(
      isDisjoint
        ? `The user currently has ${these} selected: ${named.join(', ')} — none of them the frame the selected elements were picked in.`
        : `The user currently has ${these} selected: ${named.join(', ')}.`,
    );
  }

  return parts.join('\n');
}
