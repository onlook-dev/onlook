import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  CreationEntryPoint,
  PickedFolder,
  ProjectCreateState,
  WorkspaceCreated,
  WorkspacePlan,
} from '@studio/events';
import { VStack } from '@astryxdesign/core/Layout';
import { t } from '@studio/i18n';
import { ImportSourceChooser } from '../onboarding/ImportSourceChooser.js';
import { dropOutgoing, holdOutgoing, landProject, outgoingProject, replaceProject, restoreOutgoing } from '../workspace/session.js';
import { subscribeToWorkspaceCreated } from '../workspace/store.js';
import { ConnectFlowContext } from './connectFlowContext.js';
import { RefusalDialog, refusalFrom, type Refusal } from './RefusalDialog.js';
import { switchOutcome } from './switchOutcome.js';
import { studio } from '../bridge.js';

export type ReadyPlan = Extract<WorkspacePlan, { kind: 'ready' }>;

type Step = null | 'refused';

export function ConnectFlowProvider({
  children,
  restoredWorkspace,
  creating,
}: {
  children: ReactNode;
  restoredWorkspace?: WorkspaceCreated;
  creating?: ProjectCreateState;
}): React.JSX.Element {
  const [step, setStep] = useState<Step>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // Escape can close the switcher while a plan is in flight; the late answer must not create.
  const pickGeneration = useRef(0);

  useEffect(subscribeToWorkspaceCreated, []);

  const start = useCallback(async (planned: { entryPoint: CreationEntryPoint }): Promise<void> => {
    const picked = await studio().pickFolder({
      title: t('project.dialog.title'),
      buttonLabel: t('project.dialog.confirm'),
    });
    if (picked.canceled || !picked.folder) return;

    const result = await studio().workspacePlan({ sourcePath: picked.folder.path });
    if (result.kind === 'refused') {
      setRefusal(refusalFrom(result));
      setStep('refused');
      return;
    }
    studio().tabsCreateProject({ sourcePath: result.sourcePath, ...planned });
  }, []);

  // The session keys a landing by path, so the switcher lands a second project through the same prop (ONL-2179).
  useEffect(() => {
    if (restoredWorkspace) void landProject(restoredWorkspace);
  }, [restoredWorkspace]);

  useEffect(() => {
    if (creating?.kind === 'planning') holdOutgoing();
    const outcome = switchOutcome(outgoingProject(), creating ?? null);
    if (outcome === 'restore') restoreOutgoing();
    else if (outcome === 'drop') dropOutgoing();
    if (creating?.kind !== 'refused') return;
    setRefusal(refusalFrom(creating));
    setStep('refused');
  }, [creating]);

  const closePicker = useCallback((): void => {
    pickGeneration.current += 1;
    setIsPickerOpen(false);
  }, []);

  const commitSwitch = useCallback(
    (plan: ReadyPlan): void => {
      closePicker();
      replaceProject();
      studio().tabsCreateProject({ sourcePath: plan.sourcePath, entryPoint: 'switcher' });
    },
    [closePicker],
  );

  const pickForSwitch = useCallback(
    (picked: PickedFolder): void => {
      const generation = pickGeneration.current;
      void (async () => {
        const result = await studio().workspacePlan({ sourcePath: picked.path });
        if (pickGeneration.current !== generation) return;
        if (result.kind === 'refused') {
          setRefusal(refusalFrom(result));
          setStep('refused');
          return;
        }
        commitSwitch(result);
      })();
    },
    [commitSwitch],
  );

  useEffect(() => {
    // `Dialog` closes itself on Escape; one keypress must not dismiss both.
    if (!isPickerOpen || step !== null) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closePicker();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closePicker, isPickerOpen, step]);

  return (
    <ConnectFlowContext
      value={{
        start: (planned) => {
          void start(planned);
        },
        openSwitcher: () => {
          setIsPickerOpen(true);
        },
      }}
    >
      {/* A view in place of `children`, not an overlay: the side panels are `zIndex: 1` siblings of the canvas and paint through an overlay (ONL-1901). */}
      {isPickerOpen ? (
        <VStack width="100%" height="100%" data-testid="project-picker">
          <ImportSourceChooser onPick={pickForSwitch} onBack={closePicker} />
        </VStack>
      ) : (
        children
      )}

      <RefusalDialog
        refusal={step === 'refused' ? refusal ?? undefined : undefined}
        onDismiss={() => {
          setStep(null);
        }}
      />
    </ConnectFlowContext>
  );
}
