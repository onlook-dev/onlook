import { HStack } from '@astryxdesign/core/Layout';

/** One row when both labels fit, the dismiss filling it; otherwise the call to action stacks above the dismiss, each full width. Both buttons take `width="100%"`. */
export function TipActions({ action, dismiss }: { action: React.JSX.Element; dismiss: React.JSX.Element }): React.JSX.Element {
  return (
    <HStack gap={1} style={{ flexWrap: 'wrap-reverse' }}>
      <div style={{ flex: '9999 1 auto', minWidth: 0 }}>{dismiss}</div>
      <div style={{ flex: '1 0 auto' }}>{action}</div>
    </HStack>
  );
}
