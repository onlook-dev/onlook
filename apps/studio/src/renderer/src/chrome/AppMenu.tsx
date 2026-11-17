import { Fragment, useEffect, useState } from 'react';
import { Divider } from '@astryxdesign/core/Divider';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { WINDOW_BAR_HEIGHT, type AppCommand, type HelpAction } from '@studio/events';

import { MenuRow } from '../menu/composerMenuRow.js';
import { t } from '@studio/i18n';
import { MENU_DIVIDER } from '../menu/surface.js';
import { Submenu } from '../menu/Submenu.js';
import { helpMenuItems } from '../rail/helpMenu.js';
import { useRailMenu } from '../rail/useRailMenu.js';
import { ignoreRefusal } from '../refusal.js';
import { comboText } from '../shortcuts/combo.js';
import { appMenuSections, type AppMenuItem, type AppMenuSection } from './appMenuSections.js';
import { useChromeExpansion, useHoverExpansion } from './expansion.js';
import './chrome.css';

/** Windows' caption buttons, which the chevron sits beside and is drawn as. */
export const APP_MENU_LOOK = {
  width: 46,
  /** The caption overlay's height, so the band's divider runs under the chevron too. */
  height: WINDOW_BAR_HEIGHT - 1,
  /** Windows' own three buttons, drawn by the system over this reserve. */
  captionButtonsWidth: 138,
  ink: 'var(--color-icon-secondary)',
  inkPressed: 'var(--color-icon-primary)',
  hover: 'var(--color-overlay-hover)',
  pressed: 'var(--color-overlay-pressed)',
  focusRing: 'inset 0 0 0 1px var(--color-accent)',
  rule: 'var(--color-border)',
  clearance: { blockStart: '5px' },
} as const;

function Chevron(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <path d="M1 3L5 7L9 3" />
    </svg>
  );
}

function Row({ item, onChosen }: { item: AppMenuItem; onChosen: (item: AppMenuItem) => void }): React.JSX.Element {
  const value = item.kind === 'command' ? item.command : item.action;
  return (
    <MenuRow
      label={t(item.label)}
      isSelected={false}
      isDisabled={item.kind === 'help' && item.isDisabled}
      {...(item.kind === 'command' && item.keys !== undefined ? { keys: comboText(item.keys, 'windows') } : {})}
      testId="app-menu-item"
      value={value}
      onClick={() => onChosen(item)}
    />
  );
}

export function AppMenuView({
  sections,
  onCommand,
  onHelp,
}: {
  sections: readonly AppMenuSection[];
  onCommand: (command: AppCommand) => void;
  onHelp: (action: HelpAction) => void;
}): React.JSX.Element {
  const expansion = useChromeExpansion();
  const menu = useRailMenu({
    label: t('rail.logoMenu.label'),
    testId: 'app-menu',
    placement: 'below',
    alignment: 'end',
    hasSubmenus: true,
    clearance: APP_MENU_LOOK.clearance,
    // Full window: the menu's light dismiss only sees a click that lands in this page.
    expansion: { claim: () => expansion.claim({ kind: 'full' }), release: expansion.release },
  });
  const hover = useHoverExpansion();
  const [pointer, setPointer] = useState<'rest' | 'hover' | 'press'>('rest');
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const choose = (item: AppMenuItem): void => {
    menu.hide();
    if (item.kind === 'command') onCommand(item.command);
    else onHelp(item.action);
  };
  const isPressed = menu.isOpen || pointer === 'press';

  return (
    <>
      <Tooltip
        content={t('rail.logoMenu.tooltip')}
        placement="below"
        hasHoverIndication={false}
        isOpen={menu.isOpen ? false : undefined}
        onOpenChange={hover.onOpenChange}
      >
        <button
          ref={menu.triggerRef}
          type="button"
          aria-label={t('rail.logoMenu.label')}
          aria-haspopup="menu"
          aria-expanded={menu.isOpen}
          data-testid="app-menu-button"
          className="region-no-drag"
          onClick={menu.toggle}
          onKeyDown={menu.onTriggerKeyDown}
          onFocus={(event) => setIsFocusVisible(event.currentTarget.matches(':focus-visible'))}
          onBlur={() => setIsFocusVisible(false)}
          onMouseEnter={() => {
            setPointer('hover');
            hover.onMouseEnter();
          }}
          onMouseLeave={() => {
            setPointer('rest');
            hover.onMouseLeave();
          }}
          onPointerDown={() => setPointer('press')}
          onPointerUp={() => setPointer('hover')}
          style={{
            appearance: 'none', border: 0, margin: 0, padding: 0, flex: '0 0 auto', outline: 'none',
            display: 'grid', placeItems: 'center',
            width: APP_MENU_LOOK.width, height: APP_MENU_LOOK.height,
            color: isPressed ? APP_MENU_LOOK.inkPressed : APP_MENU_LOOK.ink,
            background: isPressed ? APP_MENU_LOOK.pressed : pointer === 'hover' ? APP_MENU_LOOK.hover : 'transparent',
            boxShadow: isFocusVisible ? APP_MENU_LOOK.focusRing : 'none',
          }}
        >
          <Chevron />
        </button>
      </Tooltip>
      {menu.render(
        sections.map((section, index) => (
          <Fragment key={index}>
            {index > 0 ? <Divider isFullBleed style={MENU_DIVIDER} data-testid="app-menu-rule" /> : null}
            {section.map((entry) =>
              entry.kind === 'submenu' ? (
                <Submenu
                  key={entry.id}
                  label={t(entry.label)}
                  isParentOpen={menu.isOpen}
                  row={<MenuRow label={t(entry.label)} isSelected={false} hasPopout testId="app-menu-item" value={entry.id} onClick={() => undefined} />}
                >
                  {entry.groups.map((group, groupIndex) => (
                    <Fragment key={groupIndex}>
                      {groupIndex > 0 ? <Divider isFullBleed style={MENU_DIVIDER} data-testid="app-menu-rule" /> : null}
                      {group.map((item) => (
                        <Row key={item.kind === 'command' ? item.command : item.action} item={item} onChosen={choose} />
                      ))}
                    </Fragment>
                  ))}
                </Submenu>
              ) : (
                <Row key={entry.kind === 'command' ? entry.command : entry.action} item={entry} onChosen={choose} />
              ),
            )}
          </Fragment>
        )),
      )}
    </>
  );
}

/** Main's answer, read once: which commands this build offers is a fact only the host holds. */
function useOfferedCommands(): readonly AppCommand[] {
  const [offered, setOffered] = useState<readonly AppCommand[]>([]);
  useEffect(() => {
    let isActive = true;
    window.studioChrome
      .appCommands()
      .then((commands) => {
        if (isActive) setOffered(commands);
      })
      .catch(ignoreRefusal('chrome', 'app commands'));
    return () => {
      isActive = false;
    };
  }, []);
  return offered;
}

/** Windows' application menu, behind a chevron beside the caption buttons. Every command runs main's own dispatch against the active tab (ONL-3127). */
export function AppMenu({ hasRails }: { hasRails: boolean }): React.JSX.Element {
  const offered = useOfferedCommands();
  return (
    <AppMenuView
      sections={appMenuSections(offered, helpMenuItems(), hasRails)}
      onCommand={(command) => window.studioChrome.runAppCommand({ command, entryPoint: 'app_menu' })}
      onHelp={(action) => window.studioChrome.runHelpAction(action)}
    />
  );
}
