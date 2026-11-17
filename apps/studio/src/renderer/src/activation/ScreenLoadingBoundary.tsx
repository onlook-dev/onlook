import { Suspense, type ReactNode } from 'react';
import { ParkedTab } from '../ParkedScreen.js';

export function ScreenLoadingBoundary({ children, hasProjectScaffold }: { children: ReactNode; hasProjectScaffold: boolean }): React.JSX.Element {
  return <Suspense fallback={hasProjectScaffold ? <ParkedTab /> : null}>{children}</Suspense>;
}
