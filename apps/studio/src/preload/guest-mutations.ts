export function isPickerNode(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest('[data-studio-picker]'));
}

export function mutationTouchesPage<NodeType>(
  mutation: { type: string; target: NodeType; addedNodes: Iterable<NodeType>; removedNodes: Iterable<NodeType> },
  isPickerNode: (node: NodeType) => boolean,
): boolean {
  if (isPickerNode(mutation.target)) return false;
  if (mutation.type !== 'childList') return true;
  return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => !isPickerNode(node));
}

export interface PageObservationOptions {
  childList: boolean;
  subtree: boolean;
  attributes: boolean;
  characterData: boolean;
}

export function createPageObservation<RecordType, TargetType>(
  observer: {
    takeRecords(): RecordType[];
    disconnect(): void;
    observe(target: TargetType, options: PageObservationOptions): void;
  },
  target: TargetType,
  processRecords: (records: RecordType[]) => void,
): (details: boolean) => void {
  let observingDetails: boolean | undefined;
  return (details) => {
    if (observingDetails === details) return;
    processRecords(observer.takeRecords());
    observer.disconnect();
    observer.observe(target, { childList: true, subtree: true, attributes: details, characterData: details });
    observingDetails = details;
  };
}

export function restorePickerOverlay<NodeType extends { isConnected: boolean }>(
  overlay: NodeType | null,
  parent: { appendChild: (node: NodeType) => unknown } | null,
): boolean {
  if (overlay === null || overlay.isConnected || parent === null) return false;
  parent.appendChild(overlay);
  return true;
}

export function createOverlayRecovery<Token>(
  recover: () => void,
  schedule: (callback: () => void) => Token,
  cancelScheduled: (token: Token) => void,
): { request: () => void; cancel: () => void } {
  let pending: { token: Token } | null = null;
  return {
    request: () => {
      if (pending !== null) return;
      pending = { token: schedule(() => {
        pending = null;
        recover();
      }) };
    },
    cancel: () => {
      if (pending === null) return;
      cancelScheduled(pending.token);
      pending = null;
    },
  };
}
