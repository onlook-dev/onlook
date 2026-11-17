import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { RAIL_CONTROL } from './Rail.js';

import { t } from '@studio/i18n';
import { HelpIcon } from '../icons/glyphs.js';
import { useHelpMenu } from './helpMenuRows.js';

/** Help in the rail's foot. The canvas keeps its own door for when the rail is not drawn (`canvas/cornerPlacement.ts`). */
export function RailHelp(): React.JSX.Element {
  const menu = useHelpMenu('end');
  return (
    <>
      <Tooltip content={t('rail.help')} placement="end">
        <IconButton
          ref={menu.triggerRef}
          variant="ghost"
          size="lg"
          label={t('rail.help')}
          icon={<Icon icon={HelpIcon} size="md" />}
          style={RAIL_CONTROL}
          aria-haspopup="menu"
          aria-expanded={menu.isOpen}
          data-testid="rail-help"
          onClick={menu.toggle}
          onKeyDown={menu.onTriggerKeyDown}
        />
      </Tooltip>
      {menu.render(menu.rows)}
    </>
  );
}
