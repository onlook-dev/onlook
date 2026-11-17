/** The document, narrowed to what the predicate reads, so a test needs no DOM. */
export interface ModalQuery {
  querySelector?: (selectors: string) => unknown;
}

// `:modal` only matches a dialog opened with `showModal()`, so an inline showroom dialog keeps its shortcuts (ONL-2350).
export function isModalOpen(doc: ModalQuery | null | undefined): boolean {
  if (!doc) return false;
  try {
    // An engine without `:modal` throws from `querySelector` instead of answering null.
    return doc.querySelector?.(':modal') != null;
  } catch {
    return false;
  }
}
