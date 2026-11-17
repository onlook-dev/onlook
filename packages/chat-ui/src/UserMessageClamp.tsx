import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';

const CLAMP_LINES = 8;
const OPEN_LINES = 18;
const FADE_LINES = 2;

const CLAMP_HREF = 'studio-chat-user-clamp';

/* Height changes only on click, never with scroll position and never through a
   `max-height` transition: `useStickyUserMessage` measures against the row
   below, so a per-frame height is a feedback loop. */
const CLAMP_CSS = `
.studio-user-clamp {
  overflow: hidden;
  max-height: calc(${String(CLAMP_LINES)} * 1lh);
}
/* Under the cap nothing is cut, so the prompt's controls may overhang the line they sit on (ONL-2744). */
.studio-user-clamp:not([data-clamped='true']):not([data-open='true']) {
  overflow: visible;
}
.studio-user-clamp[data-clamped='true'] {
  cursor: pointer;
  mask-image: linear-gradient(to bottom, black calc(100% - ${String(FADE_LINES)}lh), transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black calc(100% - ${String(FADE_LINES)}lh), transparent 100%);
}
.studio-user-clamp[data-open='true'] {
  cursor: auto;
  max-height: calc(${String(OPEN_LINES)} * 1lh);
  overflow-y: auto;
  overscroll-behavior: contain;
  /* The full text is readable now, so nothing may be dimmed. */
  mask-image: none;
  -webkit-mask-image: none;
  scrollbar-width: thin;
  scrollbar-color: var(--color-background-gray) transparent;
}
/* No focus ring: the bubble takes focus to HOLD ITSELF OPEN, and a ring around
   a whole prompt reads as a selection the user did not make (owner,
   2026-08-25). The open state is its own visible feedback. */
.studio-user-clamp:focus,
.studio-user-clamp:focus-visible {
  outline: none;
}
/* A user prompt reads better wide: the stock bubble caps well short of the
   panel, which costs a long prompt several lines of wrapping. */
.astryx-chat-message-bubble.user {
  max-width: 93%;
}
`;

export function UserMessageClamp({ children }: { children: ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Before paint: the unclamped box overflows, so a long prompt must not show uncut for a frame (ONL-2744).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (): void => {
      // Open, the element scrolls, so `scrollHeight > clientHeight` would latch true.
      if (el.getAttribute('data-open') === 'true') return;
      // Clamped only once the box has reached its cap: a control's overhang on one line is not a cut-off prompt (ONL-2744).
      const cap = parseFloat(getComputedStyle(el).maxHeight);
      setIsClamped(el.scrollHeight - el.clientHeight > 1 && (Number.isNaN(cap) || el.clientHeight >= cap - 1));
    };
    // Registration fires `measure` synchronously, so it replaces the initial call.
    observeResize(el, measure);
    return () => {
      unobserveResize(el);
    };
  }, []);

  const open = useCallback(() => {
    if (isClamped) setIsOpen(true);
  }, [isClamped]);

  return (
    <>
      <style href={CLAMP_HREF} precedence="medium">
        {CLAMP_CSS}
      </style>
      <div
        ref={ref}
        className="studio-user-clamp"
        data-testid="chat-user-clamp"
        data-clamped={isClamped && !isOpen ? 'true' : undefined}
        data-open={isOpen ? 'true' : undefined}
        // Role, focus and handlers together; the a11y lint refuses handlers without a role.
        {...(isClamped || isOpen
          ? {
              role: 'button' as const,
              // Kept while open: dropping `tabIndex` from the focused element blurs it, which closes it.
              tabIndex: 0,
              'aria-expanded': isOpen,
              // The prompt now carries its own controls: a press on one of them is not a press on the prompt.
              onClick: (event: React.MouseEvent<HTMLDivElement>) => {
                if (!(event.target as HTMLElement).closest('button')) open();
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Escape' && isOpen) {
                  setIsOpen(false);
                  return;
                }
                // Enter and Space belong to whichever control inside the prompt has focus.
                if (event.target !== event.currentTarget) return;
                if (!isOpen && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  open();
                }
              },
              // `contains` keeps a click on its own scrollbar from closing it.
              onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsOpen(false);
                }
              },
            }
          : {})}
      >
        {children}
      </div>
    </>
  );
}
