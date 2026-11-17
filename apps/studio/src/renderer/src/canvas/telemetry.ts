import type {
  ArtifactCreateMethod,
  CanvasImageCreateMethod,
  CanvasNode,
  CanvasTextCreateMethod,
  RendererTelemetryEvent,
} from '@studio/events';
import { telemetryProjectFields } from '../workspace/store.js';
import { inlineDismissedFields, type InlineChatRecord, type InlineCloseReason } from './inlinePlacement.js';
import { studio } from '../bridge.js';

export function sendTelemetry(event: RendererTelemetryEvent): void {
  try {
    studio().telemetryEvent(event);
  } catch {
    // No telemetry door here (chrome bridge, tests) — the edit still lands.
  }
}

/** Nothing created is no arrival: the count is of objects that exist (ONL-2486). */
export function reportTextCreated(method: Exclude<CanvasTextCreateMethod, 'agent'>, count: number): void {
  if (count === 0) return;
  sendTelemetry({
    event: 'text_node_created',
    properties: { ...telemetryProjectFields(), method, count },
  });
}

export function reportImagesCreated(
  method: Exclude<CanvasImageCreateMethod, 'agent'>,
  count: number,
): void {
  if (count === 0) return;
  sendTelemetry({
    event: 'image_node_created',
    properties: { ...telemetryProjectFields(), method, count },
  });
}

/** One event per kind the gesture carried, each with that kind's count; a frame reports none. */
export function reportNodesCreated(
  nodes: readonly { kind: CanvasNode['kind'] }[],
  method: 'paste' | 'duplicate',
): void {
  reportTextCreated(method, nodes.filter((node) => node.kind === 'text').length);
  reportImagesCreated(method, nodes.filter((node) => node.kind === 'image').length);
  reportSectionsCreated(method, nodes.filter((node) => node.kind === 'section').length);
}

export function reportSectionsCreated(method: 'tool' | 'paste' | 'duplicate', count: number): void {
  if (count === 0) return;
  sendTelemetry({ event: 'section_created', properties: { ...telemetryProjectFields(), method, count } });
}

/** The artifact itself came into being; its title never rides (ONL-2568). */
export function reportArtifactCreated(method: Exclude<ArtifactCreateMethod, 'agent'>): void {
  sendTelemetry({
    event: 'artifact_created',
    properties: { ...telemetryProjectFields(), method },
  });
}

/** A node placed for an artifact that already existed. */
export function reportArtifactsPlaced(
  method: Exclude<ArtifactCreateMethod, 'agent'>,
  count: number,
): void {
  if (count === 0) return;
  sendTelemetry({
    event: 'artifact_placed',
    properties: { ...telemetryProjectFields(), method, count },
  });
}

/** A call site that also reports a close counts it twice. */
export function reportInlineChatClosed(
  state: { inlineChat: InlineChatRecord | null; inlineChatCloseReason: InlineCloseReason | null },
  prev: { inlineChat: InlineChatRecord | null },
): void {
  if (prev.inlineChat === null || state.inlineChat !== null) return;
  const reason = state.inlineChatCloseReason ?? 'unattributed';
  if (reason === 'sent') return;
  sendTelemetry({
    event: 'inline_chat_dismissed',
    properties: { ...telemetryProjectFields(), ...inlineDismissedFields(prev.inlineChat, reason) },
  });
}
