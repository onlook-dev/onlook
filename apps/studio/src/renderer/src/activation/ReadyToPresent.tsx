import { useEffect } from 'react';
import type { Screen } from './advance.js';
import { studio } from '../bridge.js';

export function ReadyToPresent({ screen }: { screen: Screen['kind'] }): null {
  useEffect(() => {
    if (screen !== 'pending') studio().uiReady();
  }, [screen]);
  return null;
}
