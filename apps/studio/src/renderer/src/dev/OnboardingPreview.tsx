import { useEffect } from 'react';

import { ConnectStep } from '../agent-setup/ConnectStep.js';
import { primeAgentSetup, subscribeToAgentSetup } from '../agent-setup/store.js';
import { ImportSourceChooser } from '../onboarding/ImportSourceChooser.js';
import { WindowFrame } from '../topbar/WindowFrame.js';
import { noop } from './showroom/Showroom.js';

/** Nothing reachable from this hash records that a user onboarded. */
export type OnboardingScenario = 'agents' | 'import';

export function OnboardingPreview({ scenario }: { scenario: OnboardingScenario }): React.JSX.Element {
  useEffect(() => {
    const unsubscribe = subscribeToAgentSetup();
    void primeAgentSetup();
    return unsubscribe;
  }, []);

  return (
    <WindowFrame>
      {scenario === 'import' ? (
        // No `onPick`/`onBack`: this hash must not reach the editor (ONL-1890).
        <ImportSourceChooser />
      ) : (
        <ConnectStep entryPoint="onboarding" onContinue={noop} />
      )}
    </WindowFrame>
  );
}
