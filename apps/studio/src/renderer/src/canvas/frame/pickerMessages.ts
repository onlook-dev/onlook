import { parsePickerToHost, type PickerToHost } from '@studio/events';

export function nextPickerGeneration(current: number): number {
  if (!Number.isSafeInteger(current) || current < 0 || current === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('picker generation exhausted');
  }
  return current + 1;
}

export interface PickerAdmissionContext {
  ownsWebview: boolean;
  /** `isPickerLive` in `geometry.ts` (ONL-2455), not the composer's armed mode. */
  pickerLive: boolean;
  activeGeneration: number;
  selectionGenerations: ReadonlyMap<string, number>;
}

/** The renderer's trust boundary: it runs before any store action. */
export function admitPickerMessage(
  args: unknown,
  context: PickerAdmissionContext,
): PickerToHost | null {
  if (!context.ownsWebview || !Array.isArray(args) || args.length !== 1) {
    return null;
  }
  const message = parsePickerToHost(args[0]);
  if (!message) return null;
  if (
    message.type === 'staleness' ||
    message.type === 'refreshed' ||
    message.type === 'anchorGeometry'
  ) {
    const id = message.type === 'refreshed' ? message.evidence.id : message.id;
    return context.selectionGenerations.get(id) === message.generation ? message : null;
  }
  // Before the live and generation gates: a wheel comes from Interact, where no picker is live, and carries no identity or page content.
  if (message.type === 'wheel') return message;
  // Same as the wheel; `parsePickerToHost` has already checked the action by name.
  if (message.type === 'zoom-chord') return message;
  // A release only ever ENDS a suppression, so it lands wherever it arrives; dropped, it strands the hand on (ONL-2577).
  // The hold keeps the gates below: admitted where no picker is live it would shield a frame the canvas still cannot pan.
  if (message.type === 'space-pan' && !message.held) return message;
  // Our preload's own error, armed or not: it carries a scrubbed report and no page content.
  if (message.type === 'error') return message;
  // A late render happens in Interact too, and the report carries nothing about what rendered.
  if (message.type === 'dom-settled') return message;
  if (!context.pickerLive || message.generation !== context.activeGeneration) return null;
  if (message.type === 'deselected' && !context.selectionGenerations.has(message.id)) return null;
  return message;
}
