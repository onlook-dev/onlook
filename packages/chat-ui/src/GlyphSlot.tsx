import type { ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/Layout';

export function GlyphSlot({ size, color, children }: { size: number; color?: string; children: ReactNode }): React.JSX.Element {
  return (
    <HStack vAlign="center" aria-hidden="true" style={{ width: size, height: size, flex: '0 0 auto', color }}>
      {children}
    </HStack>
  );
}
