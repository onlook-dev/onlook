import { HStack } from '@astryxdesign/core/Layout';
import { Kbd } from '@astryxdesign/core/Kbd';
import { Text } from '@astryxdesign/core/Text';
import type { ShortcutId } from '../shortcuts/registry.js';
import { SHORTCUTS } from '../shortcuts/registry.js';
import { HINT_SURFACE } from './hintSurface.js';

export function ToolHint({ label, shortcut }: { label: string; shortcut?: ShortcutId }): React.JSX.Element {
  return (
    <HStack vAlign="center" gap={2} style={HINT_SURFACE}>
      <Text size="sm" color="inherit">
        {label}
      </Text>
      {shortcut !== undefined ? <Kbd keys={SHORTCUTS[shortcut].keys} /> : null}
    </HStack>
  );
}

