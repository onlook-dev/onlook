import { Item } from '@astryxdesign/core/Item';
import { t } from '@studio/i18n';
import type { ComposerPermissionControl } from './composerControls.js';

const VALUE = { color: 'var(--menu-detail-color, var(--color-text-gray))', fontSize: 'var(--text-supporting-size)', whiteSpace: 'nowrap' } as const;

export function PermissionRow({ control }: { control: ComposerPermissionControl }): React.JSX.Element {
  const order = ['default', 'acceptEdits', 'auto', 'plan'];
  const rows = [...control.rows].sort((first, second) => order.indexOf(first.value) - order.indexOf(second.value));
  const selected = rows.findIndex((row) => row.isSelected);
  return (
    <div style={{ borderBlockStart: '0.5px solid var(--color-overlay-pressed)', marginBlockStart: 4, paddingBlockStart: 4 }}>
      <Item
        as="div"
        {...(control.isDisabled ? {} : { role: 'menuitem', tabIndex: -1 })}
        className="composer-menu-item"
        label={t('chat.composer.mode.menu.heading')}
        endContent={<span data-testid="chat-permission-value" style={VALUE}>{control.label}</span>}
        data-testid="chat-permission-row"
        data-mode={rows[selected]?.value}
        onClick={control.isDisabled ? undefined : () => rows[(selected + 1) % rows.length]?.onClick()}
        style={control.isDisabled ? { cursor: 'default', paddingInline: 'var(--spacing-2)', paddingBlock: 6 } : undefined}
      />
    </div>
  );
}
