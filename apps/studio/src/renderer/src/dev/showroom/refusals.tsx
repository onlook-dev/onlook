import type { ProjectImportRefusalReason, WorkspaceRefusalReason } from '@studio/events';
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { RefusalDialog } from '../../canvas/RefusalDialog.js';
import { ConnectFlowProvider } from '../../canvas/ConnectFlow.js';
import { BlankCreateFailedDialog } from '../../create/BlankCreateModal.js';
import { ImportRefusalDialog } from '../../projects/ImportRefusalBody.js';
import { OpenRefusalDialog } from '../../projects/OpenRefusalDialog.js';
import { Focused, noop, type Gallery, type Story } from './Showroom.js';

const FOLDER_REASONS = ['already-copied', 'no-base-ref', 'name-unavailable', 'nothing-to-copy'] as const satisfies readonly WorkspaceRefusalReason[];
const IMPORT_REASONS = ['not-a-repository', 'repository-gone', 'is-the-repository', 'inside-a-project', 'already-a-project', 'busy', 'being-cleaned-up', 'fields-incomplete'] as const satisfies readonly ProjectImportRefusalReason[];

function Folder({ reason }: { reason: WorkspaceRefusalReason }): React.JSX.Element {
  return <RefusalDialog isInline refusal={{ reason, projectName: 'Lemonade', folderName: 'my-new-site', detail: 'The selected folder could not be copied.' }} onDismiss={noop} onCreateBlank={noop} />;
}

function Import({ reason }: { reason: ProjectImportRefusalReason }): React.JSX.Element {
  return <ImportRefusalDialog isInline reason={reason} onDismiss={noop} />;
}

function Interactive(): React.JSX.Element {
  const [open, setOpen] = useState<'folder' | 'import' | 'creation' | null>(null);
  const [action, setAction] = useState('');
  return (
    <VStack gap={3}>
      <HStack gap={2}>
        <Button label="Folder refusal" onClick={() => { setAction(''); setOpen('folder'); }} />
        <Button label="Import refusal" onClick={() => { setAction(''); setOpen('import'); }} />
        <Button label="Creation failure" onClick={() => { setAction(''); setOpen('creation'); }} />
      </HStack>
      <Text data-testid="refusal-action">{action}</Text>
      <RefusalDialog refusal={open === 'folder' ? { reason: 'nothing-to-copy', folderName: 'my-new-site' } : undefined} onDismiss={() => setOpen(null)} onCreateBlank={() => { setAction('Create blank project'); setOpen(null); }} />
      <ImportRefusalDialog reason={open === 'import' ? 'not-a-repository' : null} onDismiss={() => setOpen(null)} />
      <BlankCreateFailedDialog failure={open === 'creation' ? { stage: 'installing', detail: 'The package manager exited before installation finished.' } : null} onRetry={() => { setAction('Retry creation'); setOpen(null); }} onClose={() => setOpen(null)} />
    </VStack>
  );
}

const stories: Story[] = [
  ...(['at-limit', 'unknown-project', 'workspace-missing', 'removing', 'failed'] as const).map((reason) => ({ id: `open-${reason}`, title: `Open project: ${reason}`, render: () => <OpenRefusalDialog reason={reason} isInline onDismiss={noop} /> })),
  ...(['focus', 'hover'] as const).map((state) => ({ id: `open-close-${state}`, title: `Open project Close: ${state}`, render: () => <Focused selector="[data-testid='project-open-dismiss']" hover={state === 'hover'}><OpenRefusalDialog reason="at-limit" isInline onDismiss={noop} /></Focused> })),
  { id: 'refusals-interactive', title: 'Open, focus and dismiss', render: () => <Interactive /> },
  { id: 'canvas-refusal', title: 'Canvas caller', render: (context) => context?.isIsolated ? <ConnectFlowProvider creating={{ kind: 'refused', sourceRepoName: 'Lemonade', reason: 'no-base-ref' }}><Text>Canvas refusal</Text></ConnectFlowProvider> : <Text>Open this story to inspect the Canvas refusal.</Text> },
  { id: 'refusals-family', title: 'One failure family', wide: true, render: () => <><Folder reason="already-copied" /><Import reason="not-a-repository" /><div style={{ width: 460 }}><BlankCreateFailedDialog failure={{ stage: 'installing', detail: 'The package manager exited before installation finished.' }} isInline onRetry={noop} onClose={noop} /></div></> },
  ...FOLDER_REASONS.map((reason) => ({ id: `folder-${reason}`, title: `Folder: ${reason}`, render: () => <Folder reason={reason} /> })),
  ...IMPORT_REASONS.map((reason) => ({ id: `import-${reason}`, title: `Import: ${reason}`, render: () => <Import reason={reason} /> })),
  { id: 'creation-failed', title: 'Project creation', render: () => <div style={{ width: 460 }}><BlankCreateFailedDialog failure={{ stage: 'installing', detail: 'The package manager exited before installation finished.' }} isInline onRetry={noop} onClose={noop} /></div> },
  { id: 'folder-no-detail', title: 'Folder without details', render: () => <RefusalDialog isInline refusal={{ reason: 'no-base-ref' }} onDismiss={noop} /> },
  { id: 'folder-no-create', title: 'Empty folder without creation', render: () => <RefusalDialog isInline refusal={{ reason: 'nothing-to-copy', folderName: 'my-new-site' }} onDismiss={noop} /> },
  ...(['focus', 'hover'] as const).flatMap((state) => [
    { id: `folder-close-${state}`, title: `Close: ${state}`, render: () => <Focused selector="[data-testid='workspace-refused-dismiss']" hover={state === 'hover'}><Folder reason="already-copied" /></Focused> },
    { id: `folder-start-${state}`, title: `Start blank project: ${state}`, render: () => <Focused selector="[data-testid='workspace-start-blank']" hover={state === 'hover'}><Folder reason="nothing-to-copy" /></Focused> },
    { id: `import-close-${state}`, title: `Import Close: ${state}`, render: () => <Focused selector="[data-testid='import-refused-dismiss']" hover={state === 'hover'}><Import reason="not-a-repository" /></Focused> },
  ]),
];

export const REFUSALS_GALLERY: Gallery = {
  id: 'refusals',
  title: 'Folder and import refusals',
  categories: [{ id: 'reasons', title: 'Every refusal and the creation reference', stories }],
};
