import type {
  CanvasDoc,
  CanvasDocId,
  CanvasNode,
  CanvasNodeId,
  CanvasNodeProvenance,
  CanvasOp,
  CanvasOpAuthor,
  CanvasOpEntry,
  CanvasOpPrior,
  CanvasPage,
  CanvasPageId,
  CanvasRejectionCode,
  ImageContent,
} from '@studio/events';
import {
  firstRestingPageId,
  isArtifactId,
  isBrowserNode,
  isCanvasTextSize,
  isDividerName,
  isDividerPage,
  isLastNonDividerPage,
} from '@studio/events';
import { t } from '@studio/i18n';

export const CANVAS_SCHEMA_VERSION = 1;

export interface CanvasOpContext {
  author: CanvasOpAuthor;
  /** Stamped by the caller; the reducer never reads a clock. */
  at: string;
  batchId?: string;
  /** An inverse puts back what was there, so it is not held to where a new object may land (ONL-2488). */
  restoring?: boolean;
}

export type CanvasApplyResult =
  | { ok: true; doc: CanvasDoc; entry: CanvasOpEntry }
  | { ok: false; reason: string; code?: CanvasRejectionCode };

/** No page: a fixture replay compares byte for byte, and a page minted here would make that depend on a generated id (ONL-2488). */
export function emptyCanvasDoc(docId: CanvasDocId): CanvasDoc {
  return { schemaVersion: CANVAS_SCHEMA_VERSION, docId, revision: 0, pages: {}, nodes: {} };
}

/** Derived, never minted: where the log appended and the persist did not, the next launch adopts onto this same page (ONL-2488). */
export const firstCanvasPageId = (docId: CanvasDocId): CanvasPageId => `page-${docId}`;

/** What a document still owes "every node on a page": a first page when it holds none, then one move per node no page names (ONL-2488). */
export function everyNodeAdoptionOps(doc: CanvasDoc): CanvasOp[] {
  const ops: CanvasOp[] = [];
  const minted =
    Object.keys(doc.pages ?? {}).length === 0 ? firstCanvasPageId(doc.docId) : undefined;
  if (minted !== undefined) {
    ops.push({ type: 'create-page', page: { id: minted, name: t('canvas.page.first'), order: 0 } });
  }
  const landing = minted ?? firstRestingPageId(doc);
  for (const node of Object.values(doc.nodes)) {
    if (doc.pages?.[node.pageId] === undefined) {
      ops.push({ type: 'set-node-page', id: node.id, pageId: landing });
    }
  }
  return ops;
}

export const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const positiveSize = (width: unknown, height: unknown): boolean =>
  finite(width) && width > 0 && finite(height) && height > 0;

function nodeIssue(node: CanvasNode): string | undefined {
  if (typeof node !== 'object' || node === null) return 'node must be a record';
  if (!nonEmptyString(node.id)) return 'node id must be a non-empty string';
  if (typeof node.name !== 'string') return 'node name must be a string';
  if (!finite(node.x) || !finite(node.y)) return 'node position must be finite';
  if (!positiveSize(node.width, node.height)) return 'node size must be finite and positive';
  if (!finite(node.order)) return 'node order must be finite';
  if (typeof node.content !== 'object' || node.content === null) {
    return 'node content must be a record';
  }
  switch (node.kind) {
    case 'section':
      return Object.keys(node.content).length === 0 ? undefined : 'section content must be empty';
    case 'browser':
      if (node.content.pendingHomeUrl !== undefined && !nonEmptyString(node.content.pendingHomeUrl)) {
        return 'browser node pendingHomeUrl must be a non-empty string';
      }
      return nonEmptyString(node.content.homeUrl)
        ? undefined
        : 'browser node needs a non-empty homeUrl';

    case 'text':
      if (typeof node.content.text !== 'string') return 'text node needs a text string';
      if (node.content.wrapWidth !== undefined && !positiveSize(node.content.wrapWidth, 1)) {
        return 'text wrapping width must be finite and positive';
      }
      return isCanvasTextSize(node.content.size)
        ? undefined
        : 'text node needs a size of small, medium or large';

    case 'image':
      if (!nonEmptyString(node.content.imageId)) return 'image node needs a stored image id';
      if (!nonEmptyString(node.content.name)) return 'image node needs a display name';
      if (!positiveSize(node.content.originalWidth, node.content.originalHeight)) {
        return 'image node needs finite, positive original dimensions';
      }
      return node.content.alt === undefined || typeof node.content.alt === 'string'
        ? undefined
        : 'image node alt must be a string';

    case 'artifact':
      // An id, never a path and never bytes: the store is the only thing that resolves it.
      return isArtifactId(node.content.artifactId)
        ? undefined
        : 'artifact node needs a minted artifact id';

    default: {
      const { kind } = node as { kind?: unknown };
      return `unknown node kind ${JSON.stringify(kind)}`;
    }
  }
}

function wrongKind(
  what: CanvasOp['type'],
  node: CanvasNode,
  wanted: CanvasNode['kind'],
): { reason: string } {
  return { reason: `${what}: node "${node.id}" is a ${node.kind} node, not ${wanted}` };
}

function provenanceIssue(provenance: CanvasNodeProvenance): string | undefined {
  if (typeof provenance !== 'object' || provenance === null) return 'provenance must be a record';
  if (!nonEmptyString(provenance.from) || !nonEmptyString(provenance.at)) {
    return 'provenance needs from and at';
  }
  return undefined;
}

function lookup(
  doc: CanvasDoc,
  id: CanvasNodeId,
  what: CanvasOp['type'],
): CanvasNode | { reason: string } {
  if (!nonEmptyString(id)) return { reason: `${what}: node id must be a non-empty string` };
  const node = doc.nodes[id];
  if (node === undefined) return { reason: `${what}: no node "${id}" in this document` };
  return node;
}

function pageIssue(page: CanvasPage): string | undefined {
  if (typeof page !== 'object' || page === null) return 'page must be a record';
  if (!nonEmptyString(page.id)) return 'page id must be a non-empty string';
  if (typeof page.name !== 'string') return 'page name must be a string';
  if (!finite(page.order)) return 'page order must be finite';
  return undefined;
}

function lookupPage(
  doc: CanvasDoc,
  pageId: CanvasPageId,
  what: CanvasOp['type'],
): CanvasPage | { reason: string; code?: CanvasRejectionCode } {
  if (!nonEmptyString(pageId)) {
    return { reason: `${what}: page id must be a non-empty string`, code: 'no-such-page' };
  }
  const page = doc.pages?.[pageId];
  if (page === undefined) {
    return { reason: `${what}: no page "${pageId}" in this document`, code: 'no-such-page' };
  }
  return page;
}

/** Where a mint may land, which a move's page need not be: a divider holds no object the reader can reach (ONL-2488). */
function landingPage(
  doc: CanvasDoc,
  pageId: CanvasPageId,
  what: CanvasOp['type'],
  restoring: boolean,
): CanvasPage | { reason: string; code?: CanvasRejectionCode } {
  const page = lookupPage(doc, pageId, what);
  if ('reason' in page || restoring || !isDividerPage(page)) return page;
  return {
    reason: `${what}: page "${pageId}" is a divider, not a place objects live`,
    code: 'divider-page',
  };
}

type Evaluation =
  | {
      nodes: Record<CanvasNodeId, CanvasNode>;
      pages?: Record<CanvasPageId, CanvasPage>;
      prior: CanvasOpPrior;
    }
  | { reason: string; code?: CanvasRejectionCode };

function evaluate(doc: CanvasDoc, op: CanvasOp, restoring: boolean): Evaluation {
  switch (op.type) {
    case 'create': {
      const issue = nodeIssue(op.node);
      if (issue !== undefined) return { reason: `create: ${issue}` };
      if (op.node.provenance !== undefined) {
        return { reason: 'create: only duplicate carries provenance' };
      }
      if (doc.nodes[op.node.id] !== undefined) {
        return { reason: `create: node "${op.node.id}" already exists — ids are minted once` };
      }
      const page = landingPage(doc, op.node.pageId, op.type, restoring);
      if ('reason' in page) return page;
      return { nodes: { ...doc.nodes, [op.node.id]: op.node }, prior: { kind: 'none' } };
    }

    case 'duplicate': {
      const issue = nodeIssue(op.node) ?? provenanceIssue(op.node.provenance);
      if (issue !== undefined) return { reason: `duplicate: ${issue}` };
      if (doc.nodes[op.node.id] !== undefined) {
        return { reason: `duplicate: node "${op.node.id}" already exists — ids are minted once` };
      }
      const page = landingPage(doc, op.node.pageId, op.type, restoring);
      if ('reason' in page) return page;
      return { nodes: { ...doc.nodes, [op.node.id]: op.node }, prior: { kind: 'none' } };
    }

    case 'move': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (!finite(op.x) || !finite(op.y)) return { reason: 'move: x and y must be finite' };
      return {
        nodes: { ...doc.nodes, [op.id]: { ...found, x: op.x, y: op.y } },
        prior: { kind: 'fields', id: op.id, fields: { x: found.x, y: found.y } },
      };
    }

    case 'resize': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (!finite(op.x) || !finite(op.y) || !positiveSize(op.width, op.height)) {
        return { reason: 'resize: geometry must be finite with a positive size' };
      }
      if (op.wrapWidth !== undefined && op.wrapWidth !== null && !positiveSize(op.wrapWidth, 1)) {
        return { reason: 'resize: wrapping width must be finite and positive' };
      }
      const resized = { ...found, x: op.x, y: op.y, width: op.width, height: op.height };
      if (resized.kind === 'text') {
        resized.content = { ...resized.content };
        if (op.wrapWidth === null) delete resized.content.wrapWidth;
        else resized.content.wrapWidth = op.wrapWidth ?? op.width;
      }
      return {
        nodes: {
          ...doc.nodes,
          [op.id]: resized,
        },
        prior: {
          kind: 'fields',
          id: op.id,
          fields: {
            x: found.x, y: found.y, width: found.width, height: found.height,
            ...(found.kind === 'text' ? { wrapWidth: found.content.wrapWidth ?? null } : {}),
          },
        },
      };
    }

    case 'rename': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (typeof op.name !== 'string') return { reason: 'rename: name must be a string' };
      return {
        nodes: { ...doc.nodes, [op.id]: { ...found, name: op.name } },
        prior: { kind: 'fields', id: op.id, fields: { name: found.name } },
      };
    }

    case 'reorder': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (!finite(op.order)) return { reason: 'reorder: order must be finite' };
      return {
        nodes: { ...doc.nodes, [op.id]: { ...found, order: op.order } },
        prior: { kind: 'fields', id: op.id, fields: { order: found.order } },
      };
    }

    case 'set-home-url': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (!isBrowserNode(found)) return wrongKind(op.type, found, 'browser');
      if (!nonEmptyString(op.homeUrl)) {
        return { reason: 'set-home-url: homeUrl must be a non-empty string' };
      }
      if (op.pendingHomeUrl !== undefined && op.pendingHomeUrl !== null && !nonEmptyString(op.pendingHomeUrl)) {
        return { reason: 'set-home-url: pendingHomeUrl must be a non-empty string or null' };
      }
      const content = { ...found.content, homeUrl: op.homeUrl };
      if (op.pendingHomeUrl === undefined || op.pendingHomeUrl === null) delete content.pendingHomeUrl;
      else content.pendingHomeUrl = op.pendingHomeUrl;
      return {
        nodes: {
          ...doc.nodes,
          [op.id]: { ...found, content },
        },
        prior: {
          kind: 'fields', id: op.id,
          fields: { homeUrl: found.content.homeUrl, pendingHomeUrl: found.content.pendingHomeUrl ?? null },
        },
      };
    }

    case 'set-text': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (found.kind !== 'text') return wrongKind(op.type, found, 'text');
      if (typeof op.text !== 'string') return { reason: 'set-text: text must be a string' };
      if (!positiveSize(op.width, op.height)) {
        return { reason: 'set-text: the measured size must be finite and positive' };
      }
      return {
        nodes: {
          ...doc.nodes,
          [op.id]: {
            ...found,
            width: op.width,
            height: op.height,
            content: { ...found.content, text: op.text },
          },
        },
        prior: {
          kind: 'fields',
          id: op.id,
          fields: { text: found.content.text, width: found.width, height: found.height },
        },
      };
    }

    case 'set-text-size': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (found.kind !== 'text') return wrongKind(op.type, found, 'text');
      if (!isCanvasTextSize(op.size)) {
        return { reason: 'set-text-size: size must be small, medium or large' };
      }
      if (!positiveSize(op.width, op.height)) {
        return { reason: 'set-text-size: the measured size must be finite and positive' };
      }
      return {
        nodes: {
          ...doc.nodes,
          [op.id]: {
            ...found,
            width: op.width,
            height: op.height,
            content: { ...found.content, size: op.size },
          },
        },
        prior: {
          kind: 'fields',
          id: op.id,
          fields: { size: found.content.size, width: found.width, height: found.height },
        },
      };
    }

    case 'set-image-alt': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      if (found.kind !== 'image') return wrongKind(op.type, found, 'image');
      if (typeof op.alt !== 'string') return { reason: 'set-image-alt: alt must be a string' };
      const content: ImageContent = { ...found.content, alt: op.alt };
      if (op.alt === '') delete content.alt;
      return {
        nodes: { ...doc.nodes, [op.id]: { ...found, content } },
        prior: { kind: 'fields', id: op.id, fields: { alt: found.content.alt ?? '' } },
      };
    }

    case 'remove': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      const nodes = { ...doc.nodes };
      delete nodes[op.id];
      return { nodes, prior: { kind: 'node', node: found } };
    }

    case 'create-page': {
      const issue = pageIssue(op.page);
      if (issue !== undefined) return { reason: `create-page: ${issue}` };
      if (doc.pages?.[op.page.id] !== undefined) {
        return { reason: `create-page: page "${op.page.id}" already exists — ids are minted once` };
      }
      return {
        nodes: doc.nodes,
        pages: { ...doc.pages, [op.page.id]: op.page },
        prior: { kind: 'none' },
      };
    }

    case 'rename-page': {
      const page = lookupPage(doc, op.pageId, op.type);
      if ('reason' in page) return page;
      if (typeof op.name !== 'string') return { reason: 'rename-page: name must be a string' };
      if (isDividerName(op.name) && isLastNonDividerPage(doc, page)) {
        return {
          reason: `rename-page: page "${op.pageId}" is the last page that is not a divider — a project keeps one`,
          code: 'last-non-divider-page',
        };
      }
      return {
        nodes: doc.nodes,
        pages: { ...doc.pages, [op.pageId]: { ...page, name: op.name } },
        prior: { kind: 'page-fields', pageId: op.pageId, fields: { name: page.name } },
      };
    }

    case 'reorder-page': {
      const page = lookupPage(doc, op.pageId, op.type);
      if ('reason' in page) return page;
      if (!finite(op.order)) return { reason: 'reorder-page: order must be finite' };
      return {
        nodes: doc.nodes,
        pages: { ...doc.pages, [op.pageId]: { ...page, order: op.order } },
        prior: { kind: 'page-fields', pageId: op.pageId, fields: { order: page.order } },
      };
    }

    case 'remove-page': {
      const page = lookupPage(doc, op.pageId, op.type);
      if ('reason' in page) return page;
      if (Object.keys(doc.pages).length === 1) {
        return {
          reason: `remove-page: page "${op.pageId}" is the last page — a project keeps one`,
          code: 'last-page',
        };
      }
      if (isLastNonDividerPage(doc, page)) {
        return {
          reason: `remove-page: page "${op.pageId}" is the last page that is not a divider — a project keeps one`,
          code: 'last-non-divider-page',
        };
      }
      // Exact membership, never the tolerant read: a node the writer put here is what has to move first.
      const held = Object.values(doc.nodes).filter((node) => node.pageId === op.pageId).length;
      if (held > 0) {
        return {
          reason: `remove-page: page "${op.pageId}" still holds ${String(held)} object${held === 1 ? '' : 's'} — remove them in the same batch`,
          code: 'page-not-empty',
        };
      }
      const pages = { ...doc.pages };
      delete pages[op.pageId];
      return { nodes: doc.nodes, pages, prior: { kind: 'page', page } };
    }

    case 'set-node-page': {
      const found = lookup(doc, op.id, op.type);
      if ('reason' in found) return found;
      const page = lookupPage(doc, op.pageId, op.type);
      if ('reason' in page) return page;
      return {
        nodes: { ...doc.nodes, [op.id]: { ...found, pageId: op.pageId } },
        prior: { kind: 'fields', id: op.id, fields: { pageId: found.pageId } },
      };
    }

    default: {
      // `op` is `never` to the compiler; over IPC it is whatever arrived.
      const { type } = op as { type?: unknown };
      return { reason: `unknown op type ${JSON.stringify(type)}` };
    }
  }
}

export function applyOp(doc: CanvasDoc, op: CanvasOp, context: CanvasOpContext): CanvasApplyResult {
  const outcome = evaluate(doc, op, context.restoring === true);
  if ('reason' in outcome) {
    return {
      ok: false,
      reason: outcome.reason,
      ...(outcome.code === undefined ? {} : { code: outcome.code }),
    };
  }
  const revision = doc.revision + 1;
  return {
    ok: true,
    doc: { ...doc, revision, pages: outcome.pages ?? doc.pages, nodes: outcome.nodes },
    entry: {
      revision,
      author: context.author,
      at: context.at,
      ...(context.batchId === undefined ? {} : { batchId: context.batchId }),
      op,
      prior: outcome.prior,
    },
  };
}

export function invertOp(entry: CanvasOpEntry): CanvasOp {
  const { op, prior } = entry;
  switch (prior.kind) {
    case 'none': {
      if (op.type === 'create-page') return { type: 'remove-page', pageId: op.page.id };
      if (op.type !== 'create' && op.type !== 'duplicate') break;
      return { type: 'remove', id: op.node.id };
    }

    case 'node': {
      if (op.type !== 'remove') break;
      const { provenance, ...node } = prior.node;
      return provenance !== undefined
        ? { type: 'duplicate', node: { ...node, provenance } }
        : { type: 'create', node };
    }

    case 'fields': {
      const { fields } = prior;
      switch (op.type) {
        case 'move':
          if (finite(fields.x) && finite(fields.y)) {
            return { type: 'move', id: prior.id, x: fields.x, y: fields.y };
          }
          break;
        case 'resize':
          if (finite(fields.x) && finite(fields.y) && finite(fields.width) && finite(fields.height)) {
            return {
              type: 'resize',
              id: prior.id,
              x: fields.x,
              y: fields.y,
              width: fields.width,
              height: fields.height,
              ...('wrapWidth' in fields ? { wrapWidth: fields.wrapWidth } : {}),
            };
          }
          break;
        case 'rename':
          if (typeof fields.name === 'string') {
            return { type: 'rename', id: prior.id, name: fields.name };
          }
          break;
        case 'reorder':
          if (finite(fields.order)) return { type: 'reorder', id: prior.id, order: fields.order };
          break;
        case 'set-home-url':
          if (typeof fields.homeUrl === 'string') {
            return {
              type: 'set-home-url', id: prior.id, homeUrl: fields.homeUrl,
              ...('pendingHomeUrl' in fields ? { pendingHomeUrl: fields.pendingHomeUrl } : {}),
            };
          }
          break;
        case 'set-text':
          if (typeof fields.text === 'string' && finite(fields.width) && finite(fields.height)) {
            return {
              type: 'set-text',
              id: prior.id,
              text: fields.text,
              width: fields.width,
              height: fields.height,
            };
          }
          break;
        case 'set-text-size':
          if (isCanvasTextSize(fields.size) && finite(fields.width) && finite(fields.height)) {
            return {
              type: 'set-text-size',
              id: prior.id,
              size: fields.size,
              width: fields.width,
              height: fields.height,
            };
          }
          break;
        case 'set-image-alt':
          if (typeof fields.alt === 'string') {
            return { type: 'set-image-alt', id: prior.id, alt: fields.alt };
          }
          break;
        case 'set-node-page':
          if (typeof fields.pageId === 'string' && fields.pageId.length > 0) {
            return { type: 'set-node-page', id: prior.id, pageId: fields.pageId };
          }
          break;
        default:
          break;
      }
      break;
    }

    case 'page': {
      if (op.type !== 'remove-page') break;
      return { type: 'create-page', page: prior.page };
    }

    case 'page-fields': {
      const { fields } = prior;
      if (op.type === 'rename-page' && typeof fields.name === 'string') {
        return { type: 'rename-page', pageId: prior.pageId, name: fields.name };
      }
      if (op.type === 'reorder-page' && finite(fields.order)) {
        return { type: 'reorder-page', pageId: prior.pageId, order: fields.order };
      }
      break;
    }
  }
  throw new Error(
    `cannot invert: the entry at revision ${String(entry.revision)} has a prior that does not match its op`,
  );
}
