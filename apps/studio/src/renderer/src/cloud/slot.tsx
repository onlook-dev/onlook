import { lazy, Suspense } from 'react';
import { capable } from '../capabilities.js';
import type { AccountVariant } from './AccountMenu.js';

const Account = lazy(() => import('./Account.js'));

/** Held from the rail's first paint, before the chunk or the first state lands: the Help button sits above it (ONL-2701). */
const RESERVED = { width: 28, height: 28 } as const;

/**
 * Null when the provider has no accounts, so neither placement holds a box for an account that cannot exist.
 * The row is not reserved beyond that: an official build with the flag off would hold a gap above the
 * Version line for good (ONL-2701).
 */
export function accountSlot(variant: AccountVariant): React.ReactNode {
  if (!capable('account')) return null;
  const account = <Suspense fallback={null}><Account variant={variant} /></Suspense>;
  return variant === 'icon' ? <div style={RESERVED}>{account}</div> : account;
}
