import { useEffect, useRef, useState } from 'react';
import type { HarnessId, SetupEntryPoint } from '@studio/events';
import { SetupDialog, type OnboardingUiStrings } from '@studio/onboarding-ui';
import type { SetupAction, SetupState } from '@studio/onboarding-ui/state';
import { onboardingUiStrings } from '../onboarding/uiStrings.js';
import { dialogPurposeFor, disabledActionsFor, mappedSetupFor, SetupDialogController, type SetupDialogFacts } from './dialog.js';
import { CARD_GLYPHS } from './glyphs.js';
import type { AgentSetupStrings } from '../agents/mapping.js';
import { useAgentSetupStore } from './store.js';
import { agentSetupStrings } from './strings.js';
import { useSurface } from '../activation/useSurface.js';
import { sendTelemetry } from '../canvas/telemetry.js';
import { studio } from '../bridge.js';
import { ignoreRefusal } from '../refusal.js';
import { useModal } from '../overlay/modalStack.js';

export interface SetupStrings {
  ui: OnboardingUiStrings;
  setup: AgentSetupStrings;
}

let strings: SetupStrings | undefined;

export function setupStrings(): SetupStrings {
  strings ??= { ui: onboardingUiStrings(), setup: agentSetupStrings() };
  return strings;
}

/** Shared by the dialog and the chat's sign-in card so the two agree on the funnel's entry point (ONL-2187). */
export function makeSetupController(
  harness: HarnessId,
  entryPoint: SetupEntryPoint,
  onClose: () => void,
  onSwitchHarness?: () => void,
): SetupDialogController {
  return new SetupDialogController({
    harness,
    entryPoint,
    actions: () => useAgentSetupStore.getState(),
    readClipboardText: () => studio().readClipboardText().then((result) => result.text, (error: unknown) => { ignoreRefusal('agent-setup', 'readClipboardText')(error); return ''; }),
    writeClipboardText: (text) => {
      void navigator.clipboard.writeText(text).catch(ignoreRefusal('agent-setup', 'copy text'));
    },
    openTerminal: () => studio().openTerminal().catch(ignoreRefusal('agent-setup', 'openTerminal')),
    plan: () => useAgentSetupStore.getState().claude.plan,
    onClose,
    ...(onSwitchHarness === undefined ? {} : { onSwitchHarness }),
  });
}

export interface SetupDialogViewProps {
  harness: HarnessId;
  facts: SetupDialogFacts;
  strings: SetupStrings;
  onAction: (action: SetupAction, state: SetupState, browserId?: string) => void;
  onCodeChange?: (code: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  offersOtherAgent?: boolean;
  isInline?: boolean;
  now?: number;
}

export function SetupDialogView({ harness, facts, strings, onAction, onCodeChange, onOpenChange, offersOtherAgent = true, isInline = false, now = Date.now() }: SetupDialogViewProps): React.JSX.Element {
  const mapped = mappedSetupFor(harness, facts, strings.setup, now);
  useModal(!isInline);
  return (
    <SetupDialog
      state={mapped.state}
      isOpen
      onOpenChange={onOpenChange}
      onAction={(action, browserId) => onAction(action, mapped.state, browserId)}
      browsers={facts.claude.browsers}
      {...(onCodeChange === undefined ? {} : { onCodeChange })}
      strings={strings.ui}
      glyphs={CARD_GLYPHS}
      purpose={dialogPurposeFor(mapped.state)}
      disabledActions={disabledActionsFor(mapped.state, facts, now)}
      isBusy={mapped.busy}
      offersOtherAgent={offersOtherAgent}
      isInline={isInline}
      testId={`onboarding-dialog-${harness}`}
    />
  );
}

export interface SetupDialogHostProps {
  harness: HarnessId;
  entryPoint: SetupEntryPoint;
  onClose: () => void;
  /** Absent where no other harness's setup can be opened; the sheet offering it is never drawn there (ONL-2496). */
  onSwitchHarness?: () => void;
}

/** Mount keyed by harness: the controller is built once per mount. */
export function SetupDialogHost({ harness, entryPoint, onClose, onSwitchHarness }: SetupDialogHostProps): React.JSX.Element {
  const claude = useAgentSetupStore((s) => s.claude);
  const claudeSettled = useAgentSetupStore((s) => s.claudeSettled);
  const codex = useAgentSetupStore((s) => s.codex);
  const code = useAgentSetupStore((s) => s.code);
  const codexSignInAttempted = useAgentSetupStore((s) => s.codexSignInAttempted);
  const inFlight = useAgentSetupStore((s) => s.inFlight);
  const mapped = mappedSetupFor(harness, { claude, claudeSettled, codex, code, codexSignInAttempted, inFlight }, setupStrings().setup);
  const failed = ['fallback', 'cannot-connect', 'setup-failed', 'wont-start', 'out-of-date'].includes(mapped.state.state);
  const terminal = failed || mapped.state.state === 'signed-in' || mapped.state.state === 'connected';
  useSurface('setup', failed ? 'error_state' : 'setup', failed ? 'setup_failed' : undefined, { harness });
  useEffect(() => {
    if (terminal) return;
    sendTelemetry({ event: 'agent_setup_opened', properties: { provider: harness, entry_point: entryPoint } });
  }, [harness, entryPoint, terminal]);

  const onCloseRef = useRef(onClose);
  const onSwitchRef = useRef(onSwitchHarness);
  useEffect(() => {
    onCloseRef.current = onClose;
    onSwitchRef.current = onSwitchHarness;
  });
  const [controller] = useState(() =>
    makeSetupController(harness, entryPoint, () => onCloseRef.current(), onSwitchHarness === undefined ? undefined : () => onSwitchRef.current?.()),
  );

  useEffect(() => {
    controller.mount();
    return () => controller.dispose();
  }, [controller]);

  const now = useRetryClock(mapped.state.state === 'cannot-connect' ? mapped.state.retryAt : undefined);

  return (
    <SetupDialogView
      harness={harness}
      facts={{ claude, claudeSettled, codex, code, codexSignInAttempted, inFlight }}
      strings={setupStrings()}
      onAction={(action, state, browserId) => void controller.act(action, state, browserId)}
      onCodeChange={(code) => useAgentSetupStore.getState().typeCode(code)}
      onOpenChange={(isOpen) => controller.onOpenChange(isOpen)}
      offersOtherAgent={onSwitchHarness !== undefined}
      now={now}
    />
  );
}

/** Re-reads the clock at `at`, and on focus: a Mac that slept past it fires the timer late (ONL-2903). */
function useRetryClock(at: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === undefined) return;
    const tick = (): void => setNow(Date.now());
    const timer = setTimeout(tick, Math.min(Math.max(at - Date.now(), 0) + 250, 2_147_483_647));
    window.addEventListener('focus', tick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', tick);
    };
  }, [at]);
  return now;
}
