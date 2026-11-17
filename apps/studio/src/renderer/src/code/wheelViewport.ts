import { EditorView, ViewPlugin } from '@codemirror/view';

const pendingScrolls = new WeakMap<EditorView, { from: number; y: 'start' | 'end'; yMargin: number }>();
const wheelOffsets = new WeakMap<EditorView, { top: number; left: number; actualTop: number; actualLeft: number }>();

function descendantOwnsWheel(event: WheelEvent, scroll: HTMLElement): boolean {
  const target = event.target as Node | null;
  let element = target?.nodeType === 1 ? target as HTMLElement : target?.parentElement;
  while (element && element !== scroll) {
    const vertical = event.deltaY !== 0 && element.scrollHeight > element.clientHeight;
    const horizontal = event.deltaX !== 0 && element.scrollWidth > element.clientWidth;
    if (vertical || horizontal) {
      const style = element.ownerDocument.defaultView?.getComputedStyle(element);
      const movesVertically = event.deltaY > 0 ? element.scrollTop < element.scrollHeight - element.clientHeight : element.scrollTop > 0;
      const movesHorizontally = event.deltaX > 0 ? element.scrollLeft < element.scrollWidth - element.clientWidth : element.scrollLeft > 0;
      if ((vertical && /^(auto|scroll)$/.test(style?.overflowY ?? '') && (movesVertically || /^(contain|none)$/.test(style?.overscrollBehaviorY ?? ''))) ||
          (horizontal && /^(auto|scroll)$/.test(style?.overflowX ?? '') && (movesHorizontally || /^(contain|none)$/.test(style?.overscrollBehaviorX ?? '')))) return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function preserveWheelScroll(view: EditorView, range: { head: number }, options: { y: string; yMargin: number }): boolean {
  const pending = pendingScrolls.get(view);
  pendingScrolls.delete(view);
  const owned = pending !== undefined && pending.from === range.head && pending.y === options.y && pending.yMargin === options.yMargin;
  if (!owned) wheelOffsets.delete(view);
  return owned;
}

export function scrollWheelViewport(event: WheelEvent, view: EditorView): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.deltaMode !== 0 || !Number.isFinite(event.deltaX) || !Number.isFinite(event.deltaY) || event.deltaY === 0) return false;
  const scroll = view.scrollDOM;
  if (scroll.clientHeight === 0 || descendantOwnsWheel(event, scroll)) return false;
  const previous = wheelOffsets.get(view);
  const unchanged = previous?.actualTop === scroll.scrollTop && previous.actualLeft === scroll.scrollLeft;
  const currentTop = unchanged ? previous.top : scroll.scrollTop;
  const currentLeft = unchanged ? previous.left : scroll.scrollLeft;
  const top = Math.max(0, Math.min(currentTop + event.deltaY, scroll.scrollHeight - scroll.clientHeight));
  const left = Math.max(0, Math.min(currentLeft + event.deltaX, scroll.scrollWidth - scroll.clientWidth));
  const blocks = view.viewportLineBlocks;
  const first = blocks[0];
  const last = blocks.at(-1);
  if (!first || !last) return false;
  const padding = view.documentPadding.top;
  event.preventDefault();
  if (top !== currentTop && (top < first.top + padding || top + scroll.clientHeight > last.bottom + padding)) {
    const forward = event.deltaY > 0;
    const edge = top + (forward ? scroll.clientHeight : 0) - padding;
    const target = view.lineBlockAtHeight(edge);
    const margin = forward ? edge - target.bottom : target.top - edge;
    const y = forward ? 'end' : 'start';
    pendingScrolls.set(view, { from: target.from, y, yMargin: margin });
    view.dispatch({ effects: EditorView.scrollIntoView(target.from, { y, yMargin: margin }) });
  }
  scroll.scrollTop = top;
  if (event.deltaX !== 0) scroll.scrollLeft = left;
  wheelOffsets.set(view, { top, left, actualTop: scroll.scrollTop, actualLeft: scroll.scrollLeft });
  return true;
}

export class WheelViewport {
  private wheel = (event: WheelEvent): void => { scrollWheelViewport(event, this.view); };

  constructor(private readonly view: EditorView) {
    view.scrollDOM.addEventListener('wheel', this.wheel, { passive: false });
  }

  destroy(): void {
    this.view.scrollDOM.removeEventListener('wheel', this.wheel);
    pendingScrolls.delete(this.view);
    wheelOffsets.delete(this.view);
  }
}

export const wheelViewport = [
  ViewPlugin.fromClass(WheelViewport),
  EditorView.scrollHandler.of(preserveWheelScroll),
  EditorView.updateListener.of(update => {
    if (update.selectionSet || update.docChanged) wheelOffsets.delete(update.view);
    const pending = pendingScrolls.get(update.view);
    if (!pending) return;
    if (update.selectionSet) pendingScrolls.delete(update.view);
    else if (update.docChanged) pending.from = update.changes.mapPos(pending.from);
  }),
];
