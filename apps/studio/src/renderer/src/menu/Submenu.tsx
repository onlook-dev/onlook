// Astryx ships no submenu: its `items` union is flat and there is no `SubMenu` export (v0.1.9).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { usePopover } from '@astryxdesign/core/Popover';
import { useListFocus } from '@astryxdesign/core/hooks';

import { MENU_PANEL } from './surface.js';

/* Clears the parent's own inset and border, so the flyout sits beside the menu rather than over its edge. On both sides: a flyout flipped to the left overlapped the menu (ONL-3127). */
const FLYOUT_GAP = 'calc(var(--spacing-1) + 4px)';

const FLYOUT_SURFACE = {
  ...MENU_PANEL,
  marginInline: FLYOUT_GAP,
  /** The panel's own inset, so its first row lines up with the row that opened it. */
  marginBlockStart: 'calc(-1 * var(--spacing-1))',
  minWidth: 160,
} as React.CSSProperties;

export function Submenu({
  row,
  children,
  label,
  isParentOpen,
}: {
  row: ReactNode;
  children: ReactNode;
  label: string;
  /** Closing the parent closes this; Astryx's `DropdownMenu` exposes no `onHide` to watch (ONL-1910). */
  isParentOpen: boolean;
}): React.JSX.Element {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const bridgeRef = useRef<HTMLDivElement | null>(null);
  const [wasParentOpen, setWasParentOpen] = useState(isParentOpen);
  const [bridge, setBridge] = useState<React.CSSProperties | null>(null);

  const flyout = usePopover({
    role: 'none',
    hasCloseButton: false,
    hasAutoFocus: false,
    // Two `auto` popovers that are not DOM ancestors evict each other: light dismiss here closes the anchoring menu (ONL-1910).
    hasLightDismiss: false,
    hasEscapeDismiss: false,
    hasSurface: false,
  });
  const { hide, show, isOpen, triggerRef } = flyout;

  // Render phase, not an effect: the flyout goes in the same commit as the parent.
  // `DropdownMenu` skips `onOpenChange` on light dismiss; the pointer listeners below cover that path.
  if (wasParentOpen !== isParentOpen) {
    setWasParentOpen(isParentOpen);
    if (!isParentOpen) {
      if (isOpen) hide();
      if (bridge) setBridge(null);
    }
  }

  const { listRef, focusFirst, handleKeyDown } = useListFocus<HTMLDivElement>({
    itemSelector: '[role="menuitem"]',
  });

  const open = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setBridge(null);
    triggerRef(el);
    if (!isOpen) show({ skipAutoFocus: true });
  }, [isOpen, show, triggerRef]);

  // Capture phase on `document`: the gesture is read before the menu's own handlers stop it.
  useEffect(() => {
    if (!isOpen) return;

    const isOurs = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) return false;
      return anchorRef.current?.contains(target) === true || listRef.current?.contains(target) === true || bridgeRef.current?.contains(target) === true;
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (!isOurs(event.target)) hide();
    };

    const onPointerOver = (event: MouseEvent): void => {
      if (isOurs(event.target)) return;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (bridgeRef.current?.contains(hit)) {
        event.stopPropagation();
        return;
      }
      // Only a menu row closes it; the pointer crosses the canvas to reach the flyout.
      const overAMenuRow =
        event.target instanceof Element && event.target.closest('[role="menuitem"]') !== null;
      if (overAMenuRow) hide();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('mouseover', onPointerOver, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('mouseover', onPointerOver, true);
    };
  }, [isOpen, hide, listRef]);

  return (
    <>
      <div
        ref={anchorRef}
        // The row inside is the control; `DropdownMenuItem` exposes no ref or pointer props, so this box is the anchor.
        role="presentation"
        // A real box, not `display: contents`: a `contents` element cannot anchor, and the flyout rendered at the viewport origin.
        style={{ display: 'block', width: '100%' }}
        // Not on focus: arrowing past this row popped the flyout (ONL-2146).
        onMouseEnter={open}
        onPointerLeave={(event: React.PointerEvent) => {
          if (!isOpen) return;
          const anchor = anchorRef.current?.getBoundingClientRect();
          const panel = listRef.current?.getBoundingClientRect();
          if (!anchor || !panel) return;
          const isLeft = panel.left < anchor.left;
          const edge = isLeft ? panel.right : panel.left;
          const origin = event.clientX + (isLeft ? 4 : -4);
          const left = Math.min(origin, edge);
          const top = Math.min(event.clientY - 4, panel.top);
          const width = Math.abs(edge - origin);
          const height = Math.max(event.clientY + 4, panel.bottom) - top;
          if (width === 0 || height === 0) return;
          const tip = isLeft ? width : 0;
          const base = isLeft ? 0 : width;
          flushSync(() => setBridge({
            position: 'fixed', left, top, width, height,
            clipPath: `polygon(${tip}px ${event.clientY - top - 4}px, ${base}px ${panel.top - top}px, ${base}px ${panel.bottom - top}px, ${tip}px ${event.clientY - top + 4}px)`,
          }));
        }}
        // `stopPropagation`: the parent menu reads the press as a selection and closes.
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          if (isOpen) hide();
          else open();
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            open();
            requestAnimationFrame(() => focusFirst());
          }
        }}
      >
        {row}
      </div>
      {flyout.render(
        <>
          {bridge && <div ref={bridgeRef} aria-hidden="true" data-submenu-bridge="" style={bridge} onPointerLeave={() => setBridge(null)} />}
          <div
            ref={listRef}
            role="menu"
            // -1: focus roves on the `menuitem`s (ONL-2146).
            tabIndex={-1}
            // The parent menu's item selector excludes everything under this.
            data-submenu=""
            aria-label={label}
            style={FLYOUT_SURFACE}
            onPointerEnter={() => setBridge(null)}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                event.stopPropagation();
                hide();
                anchorRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
                return;
              }
              // Stopped, or the parent's handler re-focuses its list.
              if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                handleKeyDown(event);
                event.stopPropagation();
              }
            }}
          >
            {children}
          </div>
        </>,
        { placement: 'end', alignment: 'start' },
      )}
    </>
  );
}
