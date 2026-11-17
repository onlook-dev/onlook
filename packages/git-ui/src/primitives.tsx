import type { CSSProperties, ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';

export const INERT_BUTTON: CSSProperties = {
  appearance: 'none',
  border: 0,
  margin: 0,
  padding: 0,
  font: 'inherit',
  background: 'transparent',
  color: 'inherit',
};

export function PillText({
  children,
  fontSize,
  ariaHidden,
}: {
  children: ReactNode;
  fontSize: string;
  ariaHidden?: boolean;
}): React.JSX.Element {
  return (
    <Text type="body" weight="medium" color="inherit" aria-hidden={ariaHidden ? 'true' : undefined} style={{ fontSize, lineHeight: 1 }}>
      {children}
    </Text>
  );
}
