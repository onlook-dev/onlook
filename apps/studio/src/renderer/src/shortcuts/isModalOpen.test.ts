import { describe, expect, it } from 'bun:test';
import { isModalOpen, type ModalQuery } from './isModalOpen.js';

const docMatching = (...selectors: string[]): ModalQuery => ({
  querySelector: (selector: string) => (selectors.includes(selector) ? {} : null),
});

describe('isModalOpen', () => {
  it('is true while a modal dialog is open', () => {
    expect(isModalOpen(docMatching(':modal'))).toBe(true);
  });

  it('is false with no dialog at all', () => {
    expect(isModalOpen(docMatching())).toBe(false);
  });

  it('is false for an open non-modal dialog, so a gallery keeps its shortcuts', () => {
    expect(isModalOpen(docMatching('dialog[open]', 'dialog'))).toBe(false);
  });

  it('is false when the engine rejects the selector', () => {
    expect(
      isModalOpen({
        querySelector: () => {
          throw new SyntaxError("'[object Document]' is not a valid selector");
        },
      }),
    ).toBe(false);
  });

  it('is false when the document cannot be queried', () => {
    expect(isModalOpen({})).toBe(false);
    expect(isModalOpen(null)).toBe(false);
  });
});
