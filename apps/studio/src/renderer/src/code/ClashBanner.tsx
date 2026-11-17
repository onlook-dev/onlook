import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

import { t } from '@studio/i18n';
import { HAIRLINE } from '../panels/rowGeometry.js';

/** The file is gone and the tab is dirty, so it keeps its text; saving recreates the file, which containment on the nearest EXISTING ancestor makes sound (ONL-2563). */
export function MissingFileNotice({ name }: { name: string }): React.JSX.Element {
  return (
    <HStack
      role="status"
      align="center"
      gap={2}
      data-testid="code-missing-notice"
      style={{
        flexShrink: 0,
        paddingInline: 'var(--spacing-3)',
        paddingBlock: 'var(--spacing-2)',
        borderBottom: HAIRLINE,
        background: 'var(--color-background-card)',
      }}
    >
      <Text size="sm" color="secondary" maxLines={2}>
        {t('code.clash.missing', { name })}
      </Text>
    </HStack>
  );
}

export interface ClashBannerProps {
  /** The file the banner is about — it is scoped to the active tab, so it names what it describes. */
  name: string;
  /** A correlated agent write, or a save refused because the file moved under it. */
  source: 'agent' | 'disk';
  onKeepMine: () => void;
  onReload: () => void;
}

/** Scoped to the ACTIVE tab, or it lies about which file it describes. An alert, against the save bar's status: here something did happen to the designer's work (ONL-2563). */
export function ClashBanner({ name, source, onKeepMine, onReload }: ClashBannerProps): React.JSX.Element {
  return (
    <HStack
      role="alert"
      align="center"
      justify="between"
      gap={2}
      data-testid="code-clash-banner"
      data-source={source}
      style={{
        flexShrink: 0,
        paddingInline: 'var(--spacing-3)',
        paddingBlock: 'var(--spacing-2)',
        borderBottom: HAIRLINE,
        background: 'var(--color-background-card)',
      }}
    >
      <Text size="sm" color="primary" maxLines={2}>
        {t(source === 'agent' ? 'code.clash.agent' : 'code.clash.disk', { name })}
      </Text>
      <HStack align="center" gap={1} style={{ flexShrink: 0 }}>
        {/* Reload first, mine second: the destructive one is not the default reading order. */}
        <Button
          label={t('code.clash.reload')}
          variant="ghost"
          size="sm"
          onClick={onReload}
          data-testid="code-clash-reload"
        />
        <Button
          label={t('code.clash.keepMine')}
          variant="secondary"
          size="sm"
          onClick={onKeepMine}
          data-testid="code-clash-keep"
        />
      </HStack>
    </HStack>
  );
}
