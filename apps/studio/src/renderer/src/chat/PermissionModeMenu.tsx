import { useRef } from 'react';
import { Button, type ButtonProps } from '@astryxdesign/core/Button';
import { MenuHeading, MenuRow } from '../menu/composerMenuRow.js';
import { t } from '@studio/i18n';
import { MENU_PANEL } from '../menu/surface.js';
import { usePopoverMenu } from '../menu/usePopoverMenu.js';
import type { ComposerPermissionRow } from './composerControls.js';

export function PermissionModeMenu({
  label,
  rows,
  isDisabled,
  buttonStyle,
}: {
  label: string;
  rows: ComposerPermissionRow[];
  isDisabled: boolean;
  buttonStyle?: ButtonProps['style'];
}): React.JSX.Element {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // The selector the model menu walks, so a flyout added here would not capture Up/Down (ONL-2146).
  const menu = usePopoverMenu({ hasSubmenus: true });

  return (
    <>
      <Button
        ref={(el: HTMLButtonElement | null) => {
          buttonRef.current = el;
          menu.triggerRef(el);
        }}
        label={label}
        size="sm"
        variant="ghost"
        isDisabled={isDisabled}
        style={buttonStyle}
        aria-haspopup={isDisabled ? undefined : 'menu'}
        aria-expanded={isDisabled ? undefined : menu.isOpen}
        data-testid="chat-permission-mode"
        onClick={() => {
          if (menu.isOpen) {
            menu.hide();
          } else {
            menu.openAndFocus();
          }
        }}
        onKeyDown={menu.onTriggerKeyDown}
      />
      {/* One offered mode is no choice: the trigger shows the posture and opens nothing (ONL-2190). */}
      {isDisabled
        ? null
        : menu.render(
            <div
              {...menu.list}
              aria-label={t('chat.composer.mode.menu.label')}
              style={MENU_PANEL}
            >
              <MenuHeading label={t('chat.composer.mode.menu.heading')} />
              {rows.map((row) => (
                <MenuRow
                  key={row.value}
                  label={row.label}
                  isSelected={row.isSelected}
                  testId="chat-permission-mode-row"
                  value={row.value}
                  onClick={() => {
                    row.onClick();
                    menu.hide();
                  }}
                />
              ))}
            </div>,
            { placement: 'below', alignment: 'center' },
          )}
    </>
  );
}
