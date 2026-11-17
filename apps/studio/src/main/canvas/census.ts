// What a project's canvas holds at an open, read off the persisted files: no Electron and no host state, so an open's order cannot change the answer (ONL-2486).

import { readFileSync } from 'node:fs';
import { isDividerName, type CanvasOpEntry } from '@studio/events';
import { canvasDocumentNodes, canvasDocumentPages } from './assets.js';
import { canvasDocPath, canvasLogPath } from './dir.js';
import { readCanvasLog } from './log.js';
import { knownCanvasDocId } from './registry.js';

export interface CanvasCensus {
  text_node_count: number;
  image_node_count: number;
  /** Sampled when the project opens, which is the one trigger the no-sweep decision named (ONL-2568). */
  artifact_node_count: number;
  /** Absent when the log carries no creation for a label the document still holds; zero would read as "every label is new". */
  oldest_text_node_days?: number;
  page_count: number;
  /** A divider is a page the user reads as a separator, so the two counts answer different questions (ONL-2488). */
  non_divider_page_count: number;
  /** Absent for the same reason the label age is: the log carries no creation for a page the document still holds. */
  oldest_page_days?: number;
}

export const DAY_MS = 86_400_000;

function kindOf(node: unknown): unknown {
  return (node as { kind?: unknown } | null)?.kind;
}

function nameOf(page: unknown): unknown {
  return (page as { name?: unknown } | null)?.name;
}

function ageInDays(oldest: number | undefined, now: number): number | undefined {
  return oldest === undefined ? undefined : Math.max(0, Math.floor((now - oldest) / DAY_MS));
}

function canvasCensusOf(
  nodes: Readonly<Record<string, unknown>>,
  pages: Readonly<Record<string, unknown>>,
  entries: readonly CanvasOpEntry[],
  now: number,
): CanvasCensus {
  const labels = new Set<string>();
  let image_node_count = 0;
  let artifact_node_count = 0;
  for (const [id, node] of Object.entries(nodes)) {
    const kind = kindOf(node);
    if (kind === 'text') labels.add(id);
    else if (kind === 'image') image_node_count += 1;
    else if (kind === 'artifact') artifact_node_count += 1;
  }

  const pageIds = new Set(Object.keys(pages));
  let non_divider_page_count = 0;
  for (const page of Object.values(pages)) {
    const name = nameOf(page);
    if (typeof name !== 'string' || !isDividerName(name)) non_divider_page_count += 1;
  }

  let oldestLabel: number | undefined;
  let oldestPage: number | undefined;
  for (const entry of entries) {
    const at = Date.parse(entry.at);
    if (Number.isNaN(at)) continue;
    if (entry.op.type === 'create-page') {
      if (!pageIds.has(entry.op.page.id)) continue;
      if (oldestPage === undefined || at < oldestPage) oldestPage = at;
      continue;
    }
    if (entry.op.type !== 'create' && entry.op.type !== 'duplicate') continue;
    if (entry.op.node.kind !== 'text' || !labels.has(entry.op.node.id)) continue;
    if (oldestLabel === undefined || at < oldestLabel) oldestLabel = at;
  }

  const labelDays = ageInDays(oldestLabel, now);
  const pageDays = ageInDays(oldestPage, now);
  return {
    text_node_count: labels.size,
    image_node_count,
    artifact_node_count,
    ...(labelDays === undefined ? {} : { oldest_text_node_days: labelDays }),
    page_count: pageIds.size,
    non_divider_page_count,
    ...(pageDays === undefined ? {} : { oldest_page_days: pageDays }),
  };
}

export function canvasCensus(worktreePath: string, now = Date.now()): CanvasCensus {
  const docId = knownCanvasDocId(worktreePath);
  if (docId === undefined) {
    return {
      text_node_count: 0,
      image_node_count: 0,
      artifact_node_count: 0,
      page_count: 0,
      non_divider_page_count: 0,
    };
  }
  let nodes: Readonly<Record<string, unknown>> = {};
  let pages: Readonly<Record<string, unknown>> = {};
  try {
    const parsed = JSON.parse(readFileSync(canvasDocPath(docId), 'utf8')) as unknown;
    nodes = canvasDocumentNodes(parsed);
    pages = canvasDocumentPages(parsed);
  } catch {
    // A document this build cannot read holds nothing for the census; `load` sets the same file aside and mints fresh.
  }
  return canvasCensusOf(nodes, pages, readCanvasLog(canvasLogPath(docId)), now);
}
