import { useId, useRef } from 'react';
import type { HarnessId } from '@studio/events';
import { Button, type ButtonProps } from '@astryxdesign/core/Button';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Submenu } from '../menu/Submenu.jsx';
import { MenuHeading, MenuRow } from '../menu/composerMenuRow.js';
import { t } from '@studio/i18n';
import { MENU_PANEL } from '../menu/surface.js';
import { usePopoverMenu } from '../menu/usePopoverMenu.js';
import type { ComposerModelRow } from './composerControls.js';
import type { ComposerPermissionControl } from './composerControls.js';
import { PermissionRow } from './PermissionRow.js';

const POPOUT_ITEM_STYLE = { minWidth: 110 } as const;

export interface ComposerAgentAction {
  harness: HarnessId;
  ready: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export function ModelEffortMenu({
  icon,
  label,
  size,
  testId,
  modelRows,
  isDisabled,
  buttonStyle,
  permission,
  agentAction,
}: {
  icon: IconType;
  label: string;
  size: number;
  testId: string;
  modelRows: ComposerModelRow[];
  isDisabled: boolean;
  buttonStyle?: ButtonProps['style'];
  permission?: ComposerPermissionControl;
  agentAction?: ComposerAgentAction;
}): React.JSX.Element {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const consequenceId = useId();

  const menu = usePopoverMenu({ hasSubmenus: true });

  function closeAll(): void {
    menu.hide();
  }

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
        isDisabled={isDisabled && (permission === undefined || permission.rows.length === 0) && agentAction === undefined}
        style={buttonStyle}
        // `inherit` rides the button's ink, so the glyph brightens with the label on hover.
        icon={<Icon icon={icon} color="inherit" style={{ width: size, height: size, flexShrink: 0 }} />}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        data-testid={testId}
        onClick={() => {
          if (menu.isOpen) {
            closeAll();
          } else {
            menu.openAndFocus();
          }
        }}
        onKeyDown={menu.onTriggerKeyDown}
      />
      {menu.render(
        <div
          {...menu.list}
          aria-label={t('chat.composer.menu.label')}
          style={MENU_PANEL}
        >
          {modelRows.length > 0 && <MenuHeading label={t('chat.composer.menu.heading')} />}
          {modelRows.map((row) => {
            const menuRow = (
              <MenuRow
                label={row.label}
                isSelected={row.isSelected}
                hasPopout={row.effortOptions.length > 0}
                testId="chat-model-row"
                value={row.value}
                onClick={() => {
                  row.onClick();
                  closeAll();
                }}
              />
            );
            if (row.effortOptions.length === 0) {
              return <div key={row.label}>{menuRow}</div>;
            }
            return (
              // `Submenu` carries no hover timers; open/close timers flashed the previous row's options.
              <Submenu
                key={row.label}
                label={t('chat.composer.effort.menu.label', { model: row.label })}
                isParentOpen={menu.isOpen}
                row={menuRow}
              >
                <MenuHeading label={t('chat.composer.effort.menu.heading')} />
                {row.effortOptions.map((option) => (
                  <MenuRow
                    key={option.level ?? 'default'}
                    label={option.label}
                    isSelected={option.isSelected}
                    style={POPOUT_ITEM_STYLE}
                    testId="chat-effort-row"
                    value={option.level ?? 'default'}
                    onClick={() => {
                      option.onClick();
                      closeAll();
                    }}
                  />
                ))}
              </Submenu>
            );
          })}
          {agentAction === undefined ? null : (
            <div role="group" aria-describedby={agentAction.ready ? consequenceId : undefined} style={modelRows.length > 0 ? { borderBlockStart: 'var(--border-width) solid var(--color-border)', marginBlockStart: 'var(--spacing-1)', paddingBlockStart: 'var(--spacing-1)' } : undefined}>
              <MenuRow
                label={t(agentAction.ready ? 'chat.error.useOther' : 'chat.error.setUpOther', { other: t(agentAction.harness === 'codex' ? 'agent.name.codex' : 'agent.name.claude') })}
                isSelected={false}
                isDisabled={agentAction.isDisabled}
                testId="chat-switch-agent"
                value={agentAction.harness}
                onClick={() => {
                  if (agentAction.isDisabled) return;
                  closeAll();
                  agentAction.onClick();
                }}
              />
              {agentAction.ready && <div id={consequenceId} style={{ maxWidth: 240, padding: 'var(--spacing-2)', color: 'var(--color-text-gray)', fontSize: 'var(--text-supporting-size)' }}>
                {t('chat.composer.agent.consequence')}
              </div>}
            </div>
          )}
          {permission?.label === undefined ? null : <PermissionRow control={permission} />}
        </div>,
        { placement: 'below', alignment: 'center' },
      )}
    </>
  );
}
