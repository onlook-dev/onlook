/** The DOM half of the inline skill token: `ChatComposerInput` owns the editable, and these read it the way its serializer does (ONL-2744). */

const TOKEN_ATTR = 'data-astryx-token';
const VALUE_ATTR = 'data-astryx-token-value';

export function skillTokenValue(name: string): string {
  return `/${name}`;
}

export function composerEditable(root: HTMLElement | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>('[contenteditable="true"]') ?? null;
}

export function findSkillToken(editable: HTMLElement, name: string): HTMLElement | null {
  return editable.querySelector<HTMLElement>(`[${TOKEN_ATTR}][${VALUE_ATTR}="${CSS.escape(skillTokenValue(name))}"]`);
}

/** A serialized offset as a DOM point: a token counts its value and a `<br>` one newline, as the library's serializer does. */
function pointAt(editable: HTMLElement, target: number): { node: Node; offset: number } {
  let seen = 0;
  let found: { node: Node; offset: number } | undefined;
  const walk = (parent: Node): boolean => {
    const children = Array.from(parent.childNodes);
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (child === undefined) continue;
      if (child.nodeType === Node.TEXT_NODE) {
        const length = child.textContent?.length ?? 0;
        if (target <= seen + length) {
          found = { node: child, offset: target - seen };
          return true;
        }
        seen += length;
      } else if (child instanceof HTMLElement) {
        const atomic = child.hasAttribute(TOKEN_ATTR) ? (child.getAttribute(VALUE_ATTR) ?? '').length : child.tagName === 'BR' ? 1 : undefined;
        if (atomic === undefined) {
          if (walk(child)) return true;
          continue;
        }
        if (target <= seen) {
          found = { node: parent, offset: index };
          return true;
        }
        seen += atomic;
      }
    }
    return false;
  };
  walk(editable);
  return found ?? { node: editable, offset: editable.childNodes.length };
}

/** Puts the caret across a serialized range so `insertToken` replaces exactly those characters. */
export function selectSerialized(editable: HTMLElement, start: number, end: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const from = pointAt(editable, start);
  const to = pointAt(editable, end);
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Removes the token and the no-break space `insertToken` placed after it. */
export function removeSkillToken(editable: HTMLElement, name: string): boolean {
  const token = findSkillToken(editable, name);
  if (token === null) return false;
  const next = token.nextSibling;
  if (next?.nodeType === Node.TEXT_NODE && next.textContent?.startsWith(' ')) {
    if (next.textContent.length === 1) next.remove();
    else next.textContent = next.textContent.slice(1);
  }
  token.remove();
  return true;
}

/** `insertToken` and a removal leave the library's value stale; its own `input` handler re-reads the DOM. */
export function announceComposerEdit(editable: HTMLElement): void {
  editable.dispatchEvent(new Event('input', { bubbles: true }));
}
