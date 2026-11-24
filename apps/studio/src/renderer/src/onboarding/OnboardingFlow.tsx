import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { HarnessId, OnboardingImportChoice, OnboardingScreen, SurveyAnswer } from '@studio/events';

import { ConnectStep } from '../agent-setup/ConnectStep.js';
import { harnessToRecord } from '../agent-setup/gate.js';
import { useAgentSetupStore } from '../agent-setup/store.js';
import type { ReadyPlan } from '../canvas/ConnectFlow.js';
import { RefusalDialog, refusalFrom, type Refusal } from '../canvas/RefusalDialog.js';
import { useBlankCreateStore } from '../create/store.js';
import { FoundUsStep } from './FoundUsStep.js';
import { RoleStep } from './RoleStep.js';
import { ImportSourceChooser } from './ImportSourceChooser.js';
import { OnboardingSplit } from './OnboardingShell.js';
import { ignoreRefusal } from '../refusal.js';
import { MachineStep } from './MachineStep.js';
import { showsChecklist } from './checklist.js';
import { useFlag } from '../flags/store.js';
import { machineBlocked, machineCreationBlocked, machineNeedsAttention, refreshMachineChecks, useMachineStore } from './machine-store.js';
import { studio } from '../bridge.js';
import { capable } from '../capabilities.js';
import { BlockedWindowBarContext } from '../topbar/slots.js';
import { createOnboardingWalk } from './walk.js';

// Commits nothing: project state committed mid-flow flips the window bar to connected under an onboarding screen.

type OnboardingStep = 'role' | 'found' | 'agent' | 'import';
type Step = OnboardingStep;

function reportPassed(screen: Exclude<OnboardingScreen, 'import'>): void;
function reportPassed(screen: 'import', choice: OnboardingImportChoice): void;
function reportPassed(screen: OnboardingScreen, choice?: OnboardingImportChoice): void {
  studio().telemetryEvent({ event: 'onboarding_screen_passed', properties: { screen, ...(choice === undefined ? {} : { choice }) } });
}

export interface OnboardingFlowProps {
  /** Optional, not defaulted: entered at the import step, a default records a choice nobody made. */
  onComplete: (plan: ReadyPlan, harness?: HarnessId) => void;
  onCreateBlank: (harness?: HarnessId) => void;
  aside?: React.ReactNode;
  startAt?: OnboardingStep;
  resumeHarness?: HarnessId;
  onOpenExisting?: (path: string) => void;
}

export function OnboardingFlow({ onComplete, onCreateBlank, aside, startAt, resumeHarness, onOpenExisting }: OnboardingFlowProps): React.JSX.Element {
  const asksSurvey = capable('survey');
  const first: Step = asksSurvey ? startAt ?? 'role' : startAt === undefined || startAt === 'role' || startAt === 'found' ? 'agent' : startAt;
  // The checks run from here, behind the agents screen, so a quiet machine is never waited on; off they do not run, and the refresh is what knows it (ONL-3111).
  const isMachineCheckOn = useFlag('machine-check');
  useEffect(() => {
    void refreshMachineChecks();
  }, [isMachineCheckOn]);
  const blocked = useMachineStore(machineBlocked);
  const needsMachine = useMachineStore(machineNeedsAttention);
  // A last check recovering would otherwise replace the checklist before the person saw it turn ready (ONL-3111).
  const [machineShown, setMachineShown] = useState(false);
  const [machineTold, setMachineTold] = useState(false);
  const [step, setStep] = useState<Step>(first);
  // Back can leave the import step while a plan is in flight; the late answer must not create.
  const stepRef = useRef<Step>(first);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  const showMachine = showsChecklist({ enabled: isMachineCheckOn, atFirstProject: step === 'import', blocked, needsAttention: needsMachine, shown: machineShown, told: machineTold });
  // The checklist covers the import step rather than leaving it, so `stepRef` alone no longer says what is on screen.
  const showMachineRef = useRef(showMachine);
  useEffect(() => {
    showMachineRef.current = showMachine;
    if (showMachine) setMachineShown(true);
  }, [showMachine]);
  const isBehindSignIn = useContext(BlockedWindowBarContext);
  const screen: OnboardingScreen = step === 'role' || step === 'found' ? step : showMachine ? 'machine' : step;
  const [walk] = useState(createOnboardingWalk);
  useEffect(() => {
    const shown = walk.shownEvent(screen, isBehindSignIn);
    if (shown !== undefined) studio().telemetryEvent({ event: 'onboarding_screen_shown', properties: shown });
  }, [walk, screen, isBehindSignIn]);
  // Held here so Back between the two survey screens returns to what was picked.
  const [roleAnswer, setRoleAnswer] = useState<SurveyAnswer | undefined>(undefined);
  const [foundAnswer, setFoundAnswer] = useState<SurveyAnswer | undefined>(undefined);
  const [refusal, setRefusal] = useState<Refusal | undefined>(undefined);
  const harness = useRef<HarnessId | undefined>(resumeHarness);
  // Two picks in flight both resolve on the import step; only the first may create.
  const isCompleted = useRef(false);

  // A folder with no remote is refused (ONL-2178).
  const openCodebase = useCallback(
    (path: string, existing: boolean): void => {
      if (stepRef.current !== 'import' || showMachineRef.current || isCompleted.current || machineCreationBlocked() || useBlankCreateStore.getState().status.kind !== 'idle') return;
      setRefusal(undefined);
      if (existing) {
        if (onOpenExisting) {
          isCompleted.current = true;
          reportPassed('import', 'existing');
          onOpenExisting(path);
        }
        return;
      }
      void (async () => {
        const result = await studio().workspacePlan({ sourcePath: path, entryPoint: 'onboarding' });
        if (stepRef.current !== 'import' || showMachineRef.current || isCompleted.current || machineCreationBlocked() || useBlankCreateStore.getState().status.kind !== 'idle') return;
        if (result.kind === 'refused') {
          setRefusal(refusalFrom(result, path));
          return;
        }
        isCompleted.current = true;
        reportPassed('import', 'new');
        onComplete(result, harness.current);
      })();
    },
    [onComplete, onOpenExisting],
  );

  const createBlank = (): void => {
    if (machineCreationBlocked()) return;
    reportPassed('import', 'blank');
    onCreateBlank(harness.current);
  };

  const body = step === 'role' ? (
    <RoleStep
      aside={aside}
      {...(roleAnswer === undefined ? {} : { initial: roleAnswer })}
      onContinue={(answer) => {
        setRoleAnswer(answer);
        void studio().onlookAnswerSurvey(answer).catch(ignoreRefusal('onboarding', 'answer-survey'));
        void studio().onboardingProgress({ resumeAt: 'found' }).catch(ignoreRefusal('onboarding', 'save-progress'));
        reportPassed('role');
        setStep('found');
      }}
    />
  ) : step === 'found' ? (
    <FoundUsStep
      aside={aside}
      {...(foundAnswer === undefined ? {} : { initial: foundAnswer })}
      onBack={() => { setStep('role'); }}
      onContinue={(answer) => {
        setFoundAnswer(answer);
        void studio().onlookAnswerSurvey(answer).catch(ignoreRefusal('onboarding', 'answer-survey'));
        void studio().onboardingProgress({ resumeAt: 'agent' }).catch(ignoreRefusal('onboarding', 'save-progress'));
        reportPassed('found');
        setStep('agent');
      }}
    />
  ) : showMachine ? (
    <MachineStep aside={aside} onContinue={() => {
      if (machineCreationBlocked()) return;
      reportPassed('machine');
      setMachineTold(true);
    }}
      onBack={() => { setStep('agent'); }} />
  ) : step === 'agent' ? (
    <ConnectStep
      aside={aside}
      {...(asksSurvey ? { hasBack: true, onBack: () => { setStep('found'); } } : {})}
      entryPoint="onboarding"
      onContinue={(preferred) => {
        // A starred default wins: completing onboarding writes this harness to Settings › Agent.
        harness.current = preferred ?? harnessToRecord(useAgentSetupStore.getState());
        void studio().onboardingProgress({ resumeAt: 'import', ...(harness.current === undefined ? {} : { harness: harness.current }) }).catch(ignoreRefusal('onboarding', 'save-progress'));
        reportPassed('agent');
        setStep('import');
      }}
    />
  ) : (
    <>
      <ImportSourceChooser
        aside={aside}
        onOpen={openCodebase}
        onPick={(folder) => openCodebase(folder.path, false)}
        onBack={() => {
          setStep('agent');
        }}
        onCreateBlank={createBlank}
      />
      <RefusalDialog
        refusal={refusal}
        onDismiss={() => {
          setRefusal(undefined);
        }}
        onCreateBlank={() => {
          setRefusal(undefined);
          createBlank();
        }}
      />
    </>
  );
  return aside === undefined ? body : <OnboardingSplit aside={aside}>{body}</OnboardingSplit>;
}
