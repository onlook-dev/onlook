import { useEffect, useRef } from 'react';
import type { LayerAlignment, LayerPlacement } from '@astryxdesign/core/Layer';

import { MENU_PANEL } from '../menu/surface.js';
import { usePopoverMenu } from '../menu/usePopoverMenu.js';

export interface RailMenu {
  isOpen: boolean;
  triggerRef: (el: HTMLElement | null) => void;
  toggle: () => void;
  hide: () => void;
  /** Arrow-down, Enter or Space on the trigger opens and lands on the first row. */
  onTriggerKeyDown: (event: React.KeyboardEvent) => void;
  render: (rows: React.ReactNode) => React.ReactNode;
}

export interface RailMenuOptions {
  label: string;
  testId: string;
  placement: LayerPlacement;
  alignment?: LayerAlignment;
  /** A menu with flyouts leaves their rows to the submenu's own walk (ONL-2146). */
  hasSubmenus?: boolean;
  /** Margins on the layer itself, which is the gap between it and its trigger; anchor positioning leaves none (ONL-2701). */
  clearance?: { blockStart?: string; blockEnd?: string; inlineStart?: string; inlineEnd?: string };
  /** A menu in the chrome view grows the view before it shows and shrinks it once it has closed, however it closed. */
  expansion?: { claim: () => Promise<void>; release: () => void };
}

/** A rail menu: the shared popover menu, with the chrome view's expansion and the clearance from its trigger. */
export function useRailMenu({
  label,
  testId,
  placement,
  alignment = 'start',
  hasSubmenus = false,
  clearance,
  expansion,
}: RailMenuOptions): RailMenu {
  const menu = usePopoverMenu({ hasSubmenus });

  const expansionRef = useRef(expansion);
  useEffect(() => {
    expansionRef.current = expansion;
  });
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !menu.isOpen) expansionRef.current?.release();
    wasOpen.current = menu.isOpen;
  }, [menu.isOpen]);

  const openAndFocus = (): void => {
    if (expansion === undefined) menu.openAndFocus();
    else void expansion.claim().then(menu.openAndFocus);
  };

  return {
    isOpen: menu.isOpen,
    triggerRef: (el) => menu.triggerRef(el as HTMLButtonElement | null),
    hide: menu.hide,
    toggle: () => {
      if (menu.isOpen) menu.hide();
      else openAndFocus();
    },
    onTriggerKeyDown: (event) => {
      if (!menu.isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openAndFocus();
      }
    },
    render: (rows) =>
      menu.render(
        <div
          {...menu.list}
          aria-label={label}
          data-testid={testId}
          style={{
            ...MENU_PANEL,
            ...(clearance === undefined
              ? {}
              : {
                marginBlockStart: clearance.blockStart, marginBlockEnd: clearance.blockEnd,
                marginInlineStart: clearance.inlineStart, marginInlineEnd: clearance.inlineEnd,
              }),
          }}
        >
          {rows}
        </div>,
        { placement, alignment },
      ),
  };
}
