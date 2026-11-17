import { usePopover } from '@astryxdesign/core/Popover';
import { useListFocus } from '@astryxdesign/core/hooks';

export interface PopoverMenu {
  isOpen: boolean;
  triggerRef: (el: HTMLElement | null) => void;
  hide: () => void;
  /** Shows the menu and lands on its first row. */
  openAndFocus: () => void;
  /** Arrow-down, Enter or Space on the trigger opens and lands on the first row. */
  onTriggerKeyDown: (event: React.KeyboardEvent) => void;
  /** Spread on the element that holds the rows. */
  list: {
    ref: React.RefObject<HTMLDivElement | null>;
    role: 'menu';
    /** -1: focusable for the a11y rule without becoming a tab stop (ONL-2146). */
    tabIndex: -1;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
  render: ReturnType<typeof usePopover>['render'];
}

/** The popover, the roving focus and the keyboard contract of a hand-built menu. */
export function usePopoverMenu({ hasSubmenus }: {
  /** A flyout's rows are DOM descendants of the list; unexcluded, Up/Down walks into an open submenu (ONL-2146). */
  hasSubmenus: boolean;
}): PopoverMenu {
  const menu = usePopover({
    role: 'none',
    hasCloseButton: false,
    hasAutoFocus: false,
    hasLightDismiss: true,
    hasEscapeDismiss: true,
    hasSurface: false,
  });

  const { listRef, handleKeyDown, focusFirst } = useListFocus<HTMLDivElement>({
    itemSelector: hasSubmenus
      ? '[role="menuitem"]:not([data-submenu] [role="menuitem"])'
      : '[role="menuitem"]',
    onEscape: () => {
      menu.hide();
    },
  });

  const openAndFocus = (): void => {
    menu.show();
    requestAnimationFrame(() => focusFirst());
  };

  return {
    isOpen: menu.isOpen,
    triggerRef: menu.triggerRef,
    hide: menu.hide,
    openAndFocus,
    onTriggerKeyDown: (event) => {
      if (!menu.isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openAndFocus();
      }
    },
    list: {
      ref: listRef,
      role: 'menu',
      tabIndex: -1,
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && focused.getAttribute('role') === 'menuitem') {
            focused.click();
          }
          return;
        }
        handleKeyDown(event);
      },
    },
    render: menu.render,
  };
}
