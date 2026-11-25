import { BlankCreateFailedDialog, type BlankCreateFailure } from '../../create/BlankCreateModal.js';
import { t } from '@studio/i18n';
import { Focused, noop, type Gallery, type Story } from './Showroom.js';

const STARTER: BlankCreateFailure = { stage: 'starting', detail: 'Error: starter exited (code 0) before it was ready' };
const LONG = Array.from({ length: 14 }, (_, line) => `  at step ${line + 1}: the package manager wrote a line this long so the block has to scroll`).join('\n');

function Card({ failure }: { failure: BlankCreateFailure }): React.JSX.Element {
  return (
    <div style={{ width: 460 }}>
      <BlankCreateFailedDialog failure={failure} isInline onRetry={noop} onClose={noop} />
    </div>
  );
}

function story(id: string, title: string, note: string, failure: BlankCreateFailure): Story {
  return { id: `blank-create-${id}`, title, note, render: () => <Card failure={failure} /> };
}

export const BLANK_CREATE_GALLERY: Gallery = {
  id: 'blank-create',
  title: 'Blank Draft failure',
  subtitle: 'One card, one title: the failure a New Blank Draft can end in (ONL-3085).',
  categories: [
    {
      id: 'failed',
      title: 'Setup stopped',
      stories: [
        story('git-missing', 'Git isn’t installed', 'explains the prerequisite without raw output or retry', { stage: 'setting-up', cause: 'git_not_found' }),
        {
          id: 'blank-create-git-missing-focus',
          title: 'Dismiss, in keyboard focus',
          note: 'the missing-Git dialog keeps a keyboard-accessible way out',
          render: () => <Focused selector="[data-testid='blank-create-dismiss']"><Card failure={{ stage: 'setting-up', cause: 'git_not_found' }} /></Focused>,
        },
        story('starting', 'Starting', 'the starter never came up, and quoted itself', STARTER),
        story('no-detail', 'Nothing to quote', 'the card with the error block absent', { stage: 'setting-up' }),
        story('machine', 'What the computer needs', 'the checks name the cause a later create failed on (ONL-3111)', { stage: 'setting-up', explanation: t('machine.failure.developer_tools_missing'), detail: 'fatal: xcode-select: note: No developer tools were found' }),
        story('machine-two', 'Two things to fix', 'each failed check keeps its own paragraph', { stage: 'setting-up', explanation: `${t('machine.failure.developer_tools_missing')}\n\n${t('machine.failure.no_free_port')}` }),
        story('long-detail', 'A long report', 'the block scrolls instead of growing the card', { stage: 'installing', detail: LONG }),
        {
          id: 'blank-create-focus',
          title: 'Try again, in keyboard focus',
          note: 'the way back reached by Tab',
          render: () => <Focused selector="[data-testid='blank-create-retry']"><Card failure={STARTER} /></Focused>,
        },
      ],
    },
  ],
};
