import { useEffect } from 'react';

/** `gate` covers the whole window and admits nothing else; `viewer` is a full-window view in the page; `dialog` is every other modal. */
export type ModalKind = 'dialog' | 'gate' | 'viewer';

export interface ModalEntry {
  readonly id: number;
  readonly kind: ModalKind;
}

let nextId = 0;
let open: readonly ModalEntry[] = [];
const listeners = new Set<() => void>();

function publish(next: readonly ModalEntry[]): void {
  open = next;
  for (const listener of listeners) listener();
}

/** Counts a modal surface as open until the returned function runs. */
export function openModal(kind: ModalKind): () => void {
  const entry: ModalEntry = { id: (nextId += 1), kind };
  publish([...open, entry]);
  return () => {
    if (open.includes(entry)) publish(open.filter((other) => other !== entry));
  };
}

/** Every modal surface whose owner holds it open, in the order they opened. One a gate has shut in the page is still here: its owner has not let go of it. */
export function openModals(): readonly ModalEntry[] {
  return open;
}

/** What a gate asks: the modal surfaces open that are not of its own kind. */
export function modalsBesides(kind: ModalKind): readonly ModalEntry[] {
  return open.filter((entry) => entry.kind !== kind);
}

export function subscribeModals(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Holds a place in the stack for as long as the surface is open as a modal. */
export function useModal(isOpen: boolean, kind: ModalKind = 'dialog'): void {
  useEffect(() => (isOpen ? openModal(kind) : undefined), [isOpen, kind]);
}
