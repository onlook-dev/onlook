import { useCallback } from 'react';
import type { PickedFolder } from '@studio/events';
import { VStack } from '@astryxdesign/core/Layout';

import { AgentCard } from '../agents/AgentCard.js';
import { useBlankCreateStore } from '../create/store.js';
import { AddCodebase } from '../github-import/AddCodebase.js';
import { BlankProjectIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { OnboardingAccount, OnboardingDisplayHeading, OnboardingFooter, OnboardingHeading } from './OnboardingParts.js';
import { OnboardingShell } from './OnboardingShell.js';
import { studio } from '../bridge.js';

// Two columns, at the window's own floor of 960px as well: the column is about 400px there (ONL-3182).
const ROW_RULES = '.onboarding-import-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--spacing-2);width:100%}';

// `notifyProjectSelected` starts an agent session against a cwd; nothing here announces the pick until a project exists.
export interface ImportSourceChooserProps {
  onPick?: (folder: PickedFolder) => void;
  onBack?: () => void;
  onSkip?: () => void;
  onCreateBlank?: () => void;
  aside?: React.ReactNode;
  onOpen?: (path: string, existing: boolean) => void;
}

export function ImportSourceChooser({
  onPick,
  onBack,
  onSkip,
  onCreateBlank,
  aside,
  onOpen,
}: ImportSourceChooserProps = {}): React.JSX.Element {
  const isCreatingBlank = useBlankCreateStore((s) => s.status.kind === 'creating');
  const pickFolder = useCallback(async (): Promise<void> => {
    const result = await studio().pickFolder({
      title: t('project.dialog.title'),
      buttonLabel: t('project.dialog.confirm'),
      creationSource: 'folder',
    });
    if (result.canceled || !result.folder) return;
    onPick?.(result.folder);
  }, [onPick]);

  return (
    <OnboardingShell data-testid="onboarding-import" aside={aside} headerEnd={aside === undefined ? undefined : <OnboardingAccount />}>
      <VStack width="100%" gap={8} align="start">
        {aside === undefined
          ? <OnboardingHeading title="onboarding.import.title" subtitle="onboarding.import.subtitle" />
          : <OnboardingDisplayHeading title="onboarding.import.title" subtitle="onboarding.import.subtitle" />}

        <style href="onboarding-import-row" precedence="medium">{ROW_RULES}</style>
        <div className="onboarding-import-row" data-testid="onboarding-import-row">
          {/* The door renders its menu and its modal beside its card, so one cell holds all three. */}
          <div style={{ display: 'flex', minWidth: 0 }}>
            <AddCodebase
              entryPoint="onboarding"
              presentation="card"
              isBusy={isCreatingBlank}
              onFolder={() => { void pickFolder(); }}
              {...(onOpen ? { onOpen } : {})}
            />
          </div>
          <AgentCard
            state={onCreateBlank ? 'default' : 'comingSoon'}
            icon={BlankProjectIcon}
            label={t('onboarding.import.blank')}
            testId="onboarding-import-blank"
            {...(isCreatingBlank
              ? { status: t('blank.create.busy'), isStatusBusy: true, statusId: 'creating' }
              : {})}
            {...(onCreateBlank && !isCreatingBlank ? { onSelect: onCreateBlank } : {})}
          />
        </div>
      </VStack>

      {/* No `isContinueEnabled`: the OS dialog's confirm is the confirmation (ONL-1890). */}
      <OnboardingFooter hasBack onBack={onBack} {...(onSkip ? { onSkip } : {})} />
    </OnboardingShell>
  );
}
