import { create } from 'zustand';

/** A surface outside chat asking the composer to hold some text; `nonce` makes the same words twice a second request. */
export interface ComposerRequest {
  text?: string;
  append?: boolean;
  nonce: number;
}

export const useComposerRequest = create<{ request: ComposerRequest | null }>()(() => ({ request: null }));

let nonce = 0;

export function requestComposerFocus(): void {
  nonce += 1;
  useComposerRequest.setState({ request: { nonce } });
}

export function requestComposerText(text: string, append = false): void {
  nonce += 1;
  useComposerRequest.setState({ request: { text, nonce, ...(append ? { append: true } : {}) } });
}
