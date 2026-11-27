import { useRef, useState } from 'react';
import type { ChatComposerInputHandle } from '@astryxdesign/core/Chat';
import { ChatComposerDrawer } from '@astryxdesign/core/Chat';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Layout';
import { ChatPanel } from '@studio/chat-ui';
import { emptyState, type AgentSkill, type FileRef } from '@studio/events';
import { CHAT_FIXTURE_STRINGS } from '../ChatFixture.js';
import { AttachmentChips } from '../../chat/AttachmentChips.js';
import { SkillSuggestions, type SkillCatalog } from '../../chat/SkillSuggestions.js';
import { matchSkills } from '../../chat/skillMatch.js';
import { useSkillComposer } from '../../chat/useSkillComposer.js';
import { composerStatusFor } from '../../chat/composerStatus.js';
import { formatFileSize } from '../../chat/fileSize.js';
import { t } from '@studio/i18n';
import { FileGlyph, ForwardIcon, TextGlyph } from '../../icons/glyphs.js';
import { chatPanelProps } from '../../chat/panelProps.js';
import { noop, type Category } from './Showroom.js';

const SKILLS: AgentSkill[] = [
  { name: 'brand-audit', description: 'Check the palette, type and spacing against the brand.', agent: 'claude' },
  { name: 'brand-guidelines', description: 'Apply the supplied guidelines to this screen.', agent: 'claude' },
  { name: 'button-states', description: 'Review every control state, including focus.', agent: 'claude' },
  { name: 'accessibility-sweep', description: 'Find contrast, target size and label gaps.', agent: 'claude' },
  { name: 'colour-contrast', description: 'Measure contrast against WCAG and report misses.', agent: 'claude' },
  { name: 'design-tokens', description: 'Replace hard-coded values with theme tokens.', agent: 'claude' },
  { name: 'responsive-check', description: 'Adapt the layout for the narrow rail.', agent: 'claude' },
  { name: 'empty-state-pass', description: 'Write the copy for every empty and error state.', agent: 'claude' },
];
const LONGEST = SKILLS[3]!;
const FILES: FileRef[] = [
  { kind: 'file', id: 'showroom-text', name: 'brand-guidelines.html', mediaType: 'text/plain', originalSize: 18732 },
  { kind: 'file', id: 'showroom-pdf', name: 'brand-book.pdf', mediaType: 'application/pdf', originalSize: 873192 },
];

type State =
  | 'default'
  | 'token'
  | 'token-arguments'
  | 'stale'
  | 'unknown'
  | 'error'
  | 'disabled'
  | 'submitted';

type ListState = 'all' | 'filtered' | 'no-match' | 'none' | 'unavailable' | 'starting';

const LIST_QUERY: Record<ListState, string> = { all: '', filtered: 'br', 'no-match': 'zzz', none: '', unavailable: '', starting: '' };
const LIST_CATALOG: Record<ListState, SkillCatalog> = { all: 'heard', filtered: 'heard', 'no-match': 'heard', none: 'heard', unavailable: 'unavailable', starting: 'unheard' };
const LIST_SKILLS: Record<ListState, AgentSkill[]> = { all: SKILLS, filtered: SKILLS, 'no-match': SKILLS, none: [], unavailable: [], starting: [] };

/** In flow, never through the popover: `usePopover` has no inline mode and its layer escapes a story's frame. */
function Suggestions({ state, width }: { state: ListState; width: number }): React.JSX.Element {
  const skills = LIST_SKILLS[state];
  return (
    <div style={{ width, padding: 'var(--spacing-3)', background: 'var(--color-background-body)' }}>
      <SkillSuggestions
        matches={matchSkills(LIST_QUERY[state], 'claude', skills)}
        highlighted={0}
        catalog={LIST_CATALOG[state]}
        hasSkills={skills.length > 0}
        listId={`showroom-skills-${state}`}
        onChoose={noop}
        onHover={noop}
      />
    </div>
  );
}

function FilesSkills({ state, width }: { state: State; width: number }): React.JSX.Element {
  const withToken = state === 'token' || state === 'token-arguments' || state === 'stale';
  const [text, changeText] = useState(
    state === 'token-arguments'
      ? `and report every miss /${LONGEST.name} with the measured ratio beside it`
      : state === 'unknown'
        ? '/missing'
        : state === 'default' || state === 'error'
          ? 'Use these in the header.'
          : '',
  );
  const input = useRef<ChatComposerInputHandle | null>(null);
  const skill = useSkillComposer({
    text,
    input,
    agent: 'claude',
    // `stale` hears a catalog that no longer carries the chosen skill; nothing else is gone.
    skills: state === 'stale' ? SKILLS.slice(1) : SKILLS,
    heard: true,
    unavailable: false,
    disabled: state === 'disabled',
    initialSkill: withToken ? { ...(state === 'token-arguments' ? LONGEST : SKILLS[0]!), kind: 'skill' } : undefined,
  });
  const submitted = state === 'submitted';
  return (
    <div style={{ width, height: 340, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }}>
      <ChatPanel
        {...chatPanelProps({
          transcript: {
            state: {
              ...emptyState,
              items: submitted
                ? [{ kind: 'user', id: 'files-skills-message', text: 'and check the footer too', attachments: [...FILES, { ...SKILLS[0]!, kind: 'skill' }] }]
                : [],
            },
            connection: { status: state === 'disabled' ? 'error' : 'ok' },
            strings: { ...CHAT_FIXTURE_STRINGS, fileSizeLabel: formatFileSize },
            onInterrupt: noop,
            onRespond: noop,
            onCopy: noop,
            chevronIcon: ForwardIcon,
            fileGlyph: <Icon icon={FileGlyph} size="sm" />,
            textGlyph: <Icon icon={TextGlyph} size="sm" />,
          },
          composer: {
            composerValue: submitted ? '' : text,
            onComposerChange: changeText,
            composerHandleRef: input,
            skill,
            onSend: noop,
            composerStatus: state === 'error'
              ? composerStatusFor({
                  unsupportedPdfName: undefined,
                  sendRejected: false,
                  attachFailure: { reason: 'pdf-unsupported', name: 'brand-book.pdf', previous: [{ reason: 'text-too-large', name: 'large-notes.md' }] },
                  gatherRefusal: null,
                })
              : undefined,
            hasComposerPayload: !submitted,
            composerSlots: {
              drawer: submitted ? undefined : (
                <ChatComposerDrawer>
                  <HStack gap={1} style={{ flexWrap: 'wrap', width: '100%' }}>
                    <AttachmentChips drafts={FILES.map((ref) => ({ ref, name: ref.name }))} onRemove={noop} />
                  </HStack>
                </ChatComposerDrawer>
              ),
            },
          },
        })}
        // The app says an unknown skill inside the skill layer; this band and its "send anyway" exist only here.
        {...(skill.standing !== 'gone' && skill.unknown ? { composerNotice: { message: t('chat.skills.unknown'), actionLabel: t('chat.skills.sendAnyway') } } : {})}
      />
    </div>
  );
}

/** The rail's resting width and its floor (`PANEL_LIMITS.end`); the narrow one is the gate on the token's layout. */
const RESTING = 307;
const NARROW = 280;

function listStory(state: ListState, width: number) {
  return { id: `chat-skills-list-${state}-${String(width)}`, title: `${state} · ${String(width)}px`, render: () => <Suggestions state={state} width={width} /> };
}

function composerStory(state: State, width: number) {
  return { id: `chat-files-skills-${state}-${String(width)}`, title: `${state} · ${String(width)}px`, render: () => <FilesSkills state={state} width={width} /> };
}

export const SKILLS_LIST_CATEGORY: Category = {
  id: 'skills-list',
  title: 'Skills autosuggest',
  stories: [listStory('all', RESTING), listStory('filtered', RESTING), listStory('filtered', NARROW)],
};

export const SKILLS_EMPTY_CATEGORY: Category = {
  id: 'skills-empty',
  title: 'Skills autosuggest — nothing to offer',
  stories: [listStory('no-match', RESTING), listStory('none', RESTING), listStory('unavailable', RESTING), listStory('starting', RESTING)],
};

export const SKILLS_TOKEN_CATEGORY: Category = {
  id: 'skills-token',
  title: 'Skills token in the composer',
  stories: [composerStory('token-arguments', NARROW), composerStory('token-arguments', RESTING), composerStory('token', RESTING)],
};

export const SKILLS_NOTICE_CATEGORY: Category = {
  id: 'skills-notice',
  title: 'Skills notices',
  stories: [composerStory('stale', RESTING), composerStory('unknown', RESTING)],
};

export const SKILLS_SENT_CATEGORY: Category = {
  id: 'skills-sent',
  title: 'Skills in the sent message',
  stories: [composerStory('submitted', RESTING), composerStory('submitted', NARROW)],
};

export const FILES_SKILLS_CATEGORY: Category = {
  id: 'files-skills',
  title: 'Files and skills',
  stories: [composerStory('default', RESTING), composerStory('error', RESTING), composerStory('disabled', RESTING)],
};
