import type { ReactNode } from 'react';
import type { HarnessId } from '@studio/events';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack, VStack } from '@astryxdesign/core/Layout';

import { PlusIcon } from '../icons/glyphs.js';
import { NotificationSoundMenu } from './NotificationSoundMenu.js';

const GHOST_AFFORDANCE = { cursor: 'default' } as const;
import { t } from '@studio/i18n';
import { REGION } from '../layout.js';
import { PANEL_SURFACE } from '../panels/surface.js';

const HAIRLINE = 'var(--border-width) solid var(--color-border)';

export interface ChatPanelFrameProps {
  children: ReactNode;
  harness?: HarnessId | undefined;
  onNewChat?: (() => void) | undefined;
  /** Present when the control is refused; it names what to do instead (ONL-2198). */
  newChatRefusal?: string | undefined;
}

export function ChatPanelFrame({
  children,
  harness,
  onNewChat,
  newChatRefusal,
}: ChatPanelFrameProps): React.JSX.Element {
  const isRefused = newChatRefusal !== undefined;
  return (
    <VStack
      height="100%"
      data-testid="chat-panel"
      style={{
        // `width: 100%` fights the resize handle, a flex sibling, for the same pixels (ONL-1953).
        flex: '1 1 auto',
        minWidth: 0,
        ...PANEL_SURFACE,
        borderLeft: HAIRLINE,
        overflow: 'clip',
      }}
    >
      <HStack
        width="100%"
        justify="between"
        vAlign="center"
        data-testid="chat-header"
        data-harness={harness}
        style={{
          // Padding sizes this band off its own controls and breaks the divider the design runs across the window.
          height: REGION.panelHeader,
          paddingInline: 8,
          borderBottom: HAIRLINE,
          flexShrink: 0,
        }}
      >
          <NotificationSoundMenu />
          <IconButton
            label={t('chat.header.new')}
            // Inline because `Icon` spreads props after `stylex.props`; 18px is off the 12/16/20/24 ramp.
            icon={<Icon icon={PlusIcon} color="inherit" style={{ width: 18, height: 18 }} />}
            variant="ghost"
            size="sm"
            {...(isRefused
              ? { isDisabled: true, tooltip: newChatRefusal, style: GHOST_AFFORDANCE }
              : { tooltip: t('chat.header.new'), onClick: onNewChat })}
            data-testid="chat-new"
          />
      </HStack>

      {/* Without `minHeight: 0` the transcript pushes the composer past the panel's clip edge (ONL-1806). */}
      <VStack width="100%" style={{ flex: '1 0 0', minHeight: 0 }}>
        {children}
      </VStack>
    </VStack>
  );
}
