// Walks ancestors: a contentEditable="false" chip inside an editable composer still sends keys to the outer editor.
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;

  if (target.getAttribute('role') === 'textbox') return true;

  let el: HTMLElement | null = target;
  while (el) {
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }

  return false;
}
