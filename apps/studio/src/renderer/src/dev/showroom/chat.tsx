/**
 * `packages/chat-ui` as a still life, exhaustive over its exports. Fixture props; nothing
 * here has a session. `bun run showroom chat` (or `chat:tool-rows`, `chat:approval`, `chat:inline-bubble`).
 */

import { ChatComposerDrawer } from '@astryxdesign/core/Chat';
import { TOUCHED_FILES_CATEGORY, TOUCHED_FILE_PREVIEW_CATEGORY } from './touchedFiles.js';
import {
  FILES_SKILLS_CATEGORY,
  SKILLS_EMPTY_CATEGORY,
  SKILLS_LIST_CATEGORY,
  SKILLS_NOTICE_CATEGORY,
  SKILLS_SENT_CATEGORY,
  SKILLS_TOKEN_CATEGORY,
} from './chatFiles.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { DEFAULT_NOTIFICATIONS, emptyState, MAX_ELEMENT_SELECTIONS, nextTaskPicturesLine, renamedProjectResult, STALL_NOTICE_MS, SUGGEST_NEXT_TASKS_TOOL } from '@studio/events';
import type {
  AgentConnection,
  NextTaskPicture as NextTaskPictureData,
  PenView,
  PermissionMode,
  PermissionOption,
  PromptAttachment,
  Question,
  SessionState,
  ToolCallView,
  TranscriptItem,
  UserMessageDelivery,
} from '@studio/events';
import {
  ApprovalRequest,
  AttachmentPill,
  ChatPanel,
  ChatScrollButton,
  Chip,
  ImageThumbnail,
  InlineElementBubble,
  NoConnection,
  ShimmerText,
  SHIMMER_SWEEP_MS,
  ToolFileRow,
  ToolGroupedCommands,
  ToolGroupedFiles,
  ToolRow,
  ToolCalls,
  SetupTurn,
  WelcomeTurn,
  type AttachmentPillState,
  type AttachmentPillTone,
  type ChatStrings,
  type ChatWorkingRow,
  type ChipKind,
  type InlineElementBubbleProps,
  type InlineElementBubbleStrings,
} from '@studio/chat-ui';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { CHAT_FIXTURE_STRINGS as STRINGS, FIXTURE_MODELS, tool } from '../ChatFixture.js';
import { QUESTION_SHEET_CATEGORY } from './questionSheet.js';
import { CopyIcon, ReloadIcon, ForwardIcon, PaperclipIcon, SendArrowIcon, WindowGlyph } from '../../icons/glyphs.js';
import { DRAWER_STYLE } from '../../chat/elementDrawer.js';
import { NotificationInvitation } from '../../notifications/NotificationSurfaces.js';
import { useNextTaskPictures } from '../../chat/NextTaskPicture.js';
import { createPictureLoads } from '../../chat/nextTaskPictures.js';
import { attachFailureStatus } from '../../chat/composerStatus.js';
import { composerControls, permissionModeControls } from '../../chat/composerControls.js';
import { providerNotice } from '../../chat/providerNotice.js';
import type { ProviderNotice } from '@studio/events';
import { chatPanelProps, modelMenuFooter, type ComposerInput, type TranscriptInput } from '../../chat/panelProps.js';
import { penRowStrings } from '../../chat/penRow.js';
import { InlineChipRow } from '../../canvas/InlineChipRow.js';
import { AttachmentChips } from '../../chat/AttachmentChips.js';
import type { AttachmentDraft } from '../../attachments.js';
import type { ElementSelection } from '../../canvas/selection.js';
import { REGION } from '../../layout.js';
import { Focused, noop, type Category, type Gallery, type Story } from './Showroom.js';
import { setupSteps } from './chatSetupSteps.js';
import { t } from '@studio/i18n';
import '../../canvas/canvas.css';

const ROWS = STRINGS.toolRows;
const PLAIN_LINE_CALLS: ToolCallView[] = [
  { toolCallId: 'plain-0', name: 'mcp__studio__rename_project', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { name: 'Reusable Component' }, result: renamedProjectResult('Reusable Component') },
  { toolCallId: 'plain-1', name: 'mcp__studio__waiting_on', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { what: 'a component to reuse' } },
  { toolCallId: 'plain-2', name: 'mcp__studio__frame_working', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'home' } },
  { toolCallId: 'plain-3', name: 'mcp__studio__list_frames', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: {} },
  { toolCallId: 'plain-4', name: 'mcp__studio__create_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { name: 'Pricing', url: 'http://localhost:3000/pricing' } },
  { toolCallId: 'plain-5', name: 'mcp__studio__capture_frame', kind: 'other', title: 'studio', status: 'in_progress', displayStatus: 'in_progress', startedAt: 0, input: { frame_id: 'home' } },
  { toolCallId: 'plain-6', name: 'mcp__studio__move_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'pricing', width: 390 } },
  { toolCallId: 'plain-7', name: 'mcp__studio__set_frame_url', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'home', url: 'http://localhost:3000/about' } },
  { toolCallId: 'plain-8', name: 'mcp__studio__create_text', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { text: 'Design tools for teams that ship' } },
  { toolCallId: 'plain-9', name: 'mcp__studio__run_project_setup', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { action: 'restart' } },
  { toolCallId: 'plain-10', name: 'mcp__studio__create_artifact', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { title: 'Hero sketch' } },
  { toolCallId: 'plain-grep', name: 'Grep', kind: 'search', title: 'Grep', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { pattern: 'HeroBanner' } },
  { toolCallId: 'plain-task', name: 'Task', kind: 'think', title: 'Task', status: 'in_progress', displayStatus: 'in_progress', startedAt: 0, input: { description: 'Find where the header is built' } },
];
const LOOK_BEFORE_CALLS: ToolCallView[] = [
  { toolCallId: 'look-before-1', name: 'mcp__studio__evaluate_in_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'landing', script: 'pauseAt(600)' } },
  { toolCallId: 'look-before-2', name: 'mcp__studio__capture_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'landing' } },
  { toolCallId: 'look-before-3', name: 'mcp__studio__evaluate_in_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'landing', script: 'pauseAt(1200)' } },
  { toolCallId: 'look-before-4', name: 'mcp__studio__capture_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'landing' } },
];
const LOOK_AFTER_CALLS: ToolCallView[] = [
  { toolCallId: 'look-after-1', name: 'mcp__studio__capture_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'landing', setup_script: 'pauseAt(600)' } },
  { toolCallId: 'look-after-2', name: 'mcp__studio__capture_frame', kind: 'other', title: 'studio', status: 'in_progress', displayStatus: 'in_progress', startedAt: 0, input: { frame_id: 'landing', setup_script: 'pauseAt(1200)' } },
  { toolCallId: 'look-after-3', name: 'mcp__studio__move_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'pricing', width: 390 } },
  { toolCallId: 'look-after-4', name: 'mcp__studio__rename_frame', kind: 'other', title: 'studio', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { frame_id: 'pricing', name: 'Pricing' } },
];
const LOOK_NAMES = (id: string): string | undefined => ({ landing: 'Landing', pricing: 'Pricing' })[id];
const LOOK_LINKS = { icon: WindowGlyph, onActivate: noop };
const ROWS_VERBS = STRINGS.toolVerbs;
const glyph = (icon: IconType): React.ReactNode => <Icon icon={icon} size="sm" color="inherit" />;
/** A still panel's transcript: a connected session whose controls do nothing. */
const still = (state: SessionState, strings: ChatStrings = STRINGS): TranscriptInput => ({ state, connection: { status: 'ok' }, strings, onInterrupt: noop, onRespond: noop, onCopy: noop, chevronIcon: ForwardIcon });
const REST_COMPOSER: ComposerInput = { composerValue: '', onComposerChange: noop, onSend: noop };
const paperclip = glyph(PaperclipIcon);

/** The panel's real box: its width, the frame's own 12px inset, the chat scope's token re-points. */
export function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      className="astryx-chat-layout"
      style={{
        width: REGION.end,
        paddingInline: 12,
        paddingBlock: 12,
        background: 'var(--color-background-body)',
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
      }}
    >
      <VStack gap={2} width="100%">
        {children}
      </VStack>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Text type="body" color="primary" style={{ paddingBlock: 'var(--spacing-1)' }}>
      {children}
    </Text>
  );
}

const GREP = `grep -rniE "step|order|const" apps/web/src/app/\\(dashboard\\)/onboarding/hooks/useOnboardingStore/useOnboardingStore.ts | grep -iE "step" | head -30`;
const MATCHES = `apps/web/src/components/Hero/Hero.tsx:12\napps/web/src/components/Hero/HeroMedia.tsx:41\napps/web/src/styles/hero.css:3`;

const CHIP_KINDS: ChipKind[] = ['project', 'workspace', 'ref', 'neutral'];
const PILL_STATES: AttachmentPillState[] = ['unsubmitted', 'submitted'];
const PILL_TONES: AttachmentPillTone[] = ['neutral', 'accent'];

const chips: Category = {
  id: 'chips',
  title: 'Chips — inline in prose',
  stories: CHIP_KINDS.map((kind) => ({
    id: `chat-chip-${kind}`,
    title: kind,
    render: () => (
      <Prose>
        Working in <Chip kind={kind}>{kind === 'ref' ? 'feat/pricing-v2' : kind === 'project' ? 'react-project-v1' : 'skylark'}</Chip> now.
      </Prose>
    ),
  })),
};

const pills: Category = {
  id: 'attachment-pills',
  title: 'Attachment pills — state × tone × stale',
  stories: PILL_TONES.flatMap((tone) =>
    PILL_STATES.map((state) => ({
      id: `chat-pill-${tone}-${state}`,
      title: `${tone} · ${state}`,
      note: 'rest · stale · activatable',
      render: () => (
        <>
          <AttachmentPill state={state} tone={tone} label="Hero.tsx" leading={paperclip} />
          <AttachmentPill state={state} tone={tone} label="Hero.tsx" isStale leading={paperclip} />
          <AttachmentPill state={state} tone={tone} label="Frame 3 — pricing" onActivate={noop} leading={paperclip} />
        </>
      ),
    })),
  ),
};

const shimmer: Category = {
  id: 'shimmer',
  title: 'Shimmer — the working-state text',
  stories: [
    { id: 'chat-shimmer-active', title: 'active · glow', render: () => <ShimmerText isActive>Thinking about the hero</ShimmerText> },
    { id: 'chat-shimmer-no-glow', title: 'active · no glow (button size)', render: () => <ShimmerText isActive hasGlow={false}>Creating PR...</ShimmerText> },
    { id: 'chat-shimmer-settled', title: 'settled', render: () => <ShimmerText isActive={false}>Thought for 4s</ShimmerText> },
    /** The `maxLines={1}` + RTL-truncation combination `FrameToolbar.tsx`
     * passes — a fixed narrow flex item forces real truncation, so the
     * base/clone alignment is measured under the same box the mask must fit. */
    {
      id: 'chat-shimmer-align-probe',
      title: 'align probe — maxLines=1, RTL truncation (ONL-2200)',
      render: () => (
        <div style={{ display: 'flex', width: 160 }} data-testid="shimmer-align-probe">
          <ShimmerText
            isActive
            type="supporting"
            size="sm"
            maxLines={1}
            hasTruncateTooltip={false}
            style={{ minWidth: 0, direction: 'rtl', textAlign: 'left' }}
          >
            <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
              localhost:5174/dashboard/settings/billing?tab=invoices
            </span>
          </ShimmerText>
        </div>
      ),
    },
  ],
};

function frame(id: string, title: string, note: string, children: React.ReactNode): Story {
  return { id, title, note, render: () => <Panel>{children}</Panel> };
}

const toolRows: Category = {
  id: 'tool-rows',
  title: 'Tool rows — the quiet-row register (ONL-1939)',
  stories: [
    frame('shot-1-verbs-settled', '1 · The verbs — settled', 'past tense, quiet; the verb one ink step above its target', (
      <>
        <ToolRow verb="Read" target="OnboardingClient.tsx" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'file', path: 'apps/web/src/app/onboarding/OnboardingClient.tsx', lineCount: 214 }} />
        <ToolRow verb="Ran" target="Inspect onboarding store for step order" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: GREP }} />
        <ToolRow verb="Searched" target="hero-container" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'search', pattern: 'hero-container', matches: MATCHES }} />
        <ToolRow verb="Found" target="src/**/*.module.css" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'search', pattern: 'src/**/*.module.css' }} />
        <ToolRow verb="Fetched" target="react.dev/reference/react/useId" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: 'useId is a React Hook for generating unique IDs…' }} />
        <ToolRow verb="Used" target="figma — get_design_context" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: '{ "nodes": 3 }' }} />
      </>
    )),
    frame('shot-2-verbs-running', '2 · The verbs — running', 'the progressive half of each pair, shimmering; no spinner, no row of its own', (
      <>
        <ToolRow verb="Reading" target="OnboardingClient.tsx" status="running" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Running" target="Inspect onboarding store for step order" status="running" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Searching" target="hero-container" status="running" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolFileRow verb="Writing" fileName="Hero.module.css" status="running" strings={ROWS} />
        <ToolFileRow verb="Editing" fileName="tokens.css" status="running" strings={ROWS} />
      </>
    )),
    frame('shot-3-inert', '3 · Rows with nothing to open', 'no chevron on hover, no cursor change — the affordance is absent, not disabled', (
      <>
        <ToolRow verb="Read canvas" target="0 nodes" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Updated canvas" target="no-op" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Captured screenshot" target="pages-onboarding-connect" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
      </>
    )),
    frame('shot-3b-truncation', '3b · What one line costs at panel width', 'the reference clips rather than wraps; the full string is one hover or one expand away', (
      <>
        <ToolRow verb="Captured screenshot" target="pages-onboarding-connect--first-load" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Ran" target="Inspect the onboarding store for the step order it ships" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: GREP }} />
        <ToolFileRow verb="Wrote" fileName="use-onboarding-step-order.module.css" status="completed" strings={ROWS} />
        <ToolRow verb="Searched" target="(hero|banner)-(container|wrapper|shell)" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'search', pattern: '(hero|banner)-(container|wrapper|shell)' }} />
      </>
    )),
    frame('shot-3c-rename', '3c · The rename note (ONL-2181)', 'the result text is the row: the sink wrote it, so it is never a claim; running, renamed, skipped', (
      <>
        <ToolRow verb={ROWS_VERBS.rename.running} status="running" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb='Renamed to "Pricing Page"' status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: 'Renamed to "Pricing Page"' }} />
        <ToolRow verb="Rename skipped: the user named this project" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: 'Rename skipped: the user named this project' }} />
      </>
    )),
    frame('shot-3d-plain-lines', '3d · Every tool in plain words (ONL-2960)', 'what each Studio and built-in call reads as; bookkeeping calls draw nothing', (
      <ToolCalls
        calls={PLAIN_LINE_CALLS}
        strings={STRINGS}
        chevronIcon={ForwardIcon}
        onRespond={noop}
        canvasNameOf={(id) => ({ home: 'Home', pricing: 'Pricing' })[id]}
      />
    )),
    frame('shot-3e-look-line', '3e · One look, one line (ONL-2960)', 'before: a check and a look per moment; after: the look runs its own setup, and the frame name takes you to the frame', (
      <VStack gap={5}>
        <VStack gap={2}>
          <Text type="supporting" size="xsm">Before</Text>
          <ToolCalls calls={LOOK_BEFORE_CALLS} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} canvasNameOf={LOOK_NAMES} />
        </VStack>
        <VStack gap={2}>
          <Text type="supporting" size="xsm">After</Text>
          <ToolCalls calls={LOOK_AFTER_CALLS} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} canvasNameOf={LOOK_NAMES} frameLinks={LOOK_LINKS} />
        </VStack>
      </VStack>
    )),
    frame('shot-4-file-rows', '4 · File mutations', 'the same weight as every other row — no card, no border, no icon', (
      <>
        <ToolFileRow verb="Wrote" fileName="Hero.module.css" status="completed" strings={ROWS} />
        <ToolFileRow verb="Edited" fileName="tokens.css" status="completed" strings={ROWS} />
        <ToolGroupedFiles verb="Read" fileNames={['Hero.tsx', 'tokens.css', 'App.tsx']} overflow={2} status="completed" strings={ROWS} />
        <ToolGroupedFiles verb="Edited" fileNames={['Hero.tsx', 'HeroMedia.tsx']} status="completed" strings={ROWS} />
      </>
    )),
    frame('shot-5-errors', '5 · Failure — recede, do not alarm', 'a non-fatal tool error dims to the lowest ink step and says the word; red is reserved for a dead turn', (
      <>
        <ToolRow verb="Read" target="Button.tsx" status="error" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: "ENOENT: no such file or directory, open 'src/components/Button.tsx'" }} />
        <ToolRow verb="Ran" target="Typecheck the workspace" status="error" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: 'bun typecheck' }} />
        <ToolFileRow verb="Edited" fileName="tokens.css" status="error" strings={ROWS} />
        <ToolGroupedFiles verb="Read" fileNames={['Hero.tsx', 'tokens.css']} status="error" strings={ROWS} />
      </>
    )),
    frame('shot-5b-outcomes', '5b · The three outcomes, side by side (ONL-2231)', 'completed keeps its ink; failed dims and says failed; stopped keeps its ink and says stopped — and the word survives a target longer than the line', (
      <>
        <ToolRow verb="Ran" target="Typecheck the workspace" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: 'bun typecheck' }} />
        <ToolRow verb="Ran" target="Typecheck the workspace" status="error" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: 'bun typecheck' }} />
        <ToolRow verb="Ran" target="Typecheck the workspace" status="canceled" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: 'bun typecheck' }} />
        <ToolRow verb="Captured screenshot" target="localhost:5174/dashboard/settings/billing?tab=invoices&range=last-90-days&view=table" status="canceled" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolFileRow verb="Edited" fileName="tokens.css" status="canceled" strings={ROWS} />
        <ToolGroupedFiles verb="Read" fileNames={['Hero.tsx', 'tokens.css']} status="canceled" strings={ROWS} />
      </>
    )),
    frame('shot-6-grouped-collapsed', '6 · Explored — collapsed', 'a run of shell calls in one assistant message, as one skippable line', (
      <>
        <ToolGroupedCommands verb="Explored" status="completed" strings={ROWS} chevronIcon={ForwardIcon} items={[{ description: 'Find the onboarding entry', command: 'rg -l "OnboardingClient" apps/web/src' }, { description: 'Inspect onboarding store for step order', command: GREP }]} />
        <ToolGroupedCommands verb="Exploring" status="running" strings={ROWS} chevronIcon={ForwardIcon} items={[{ description: 'Find the onboarding entry', command: 'rg -l "OnboardingClient" apps/web/src' }, { command: 'ls apps/web/src/app' }, { command: 'cat package.json' }]} />
      </>
    )),
    frame('shot-7-grouped-expanded', '7 · Explored — expanded', "each call's human title above its command; a title-less call shows just the command", (
      <ToolGroupedCommands verb="Explored" status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} items={[{ description: 'Find the onboarding entry', command: 'rg -l "OnboardingClient" apps/web/src' }, { description: 'Inspect onboarding store for step order', command: GREP }, { command: 'bun run typecheck' }]} />
    )),
    frame('shot-8-expanded-file', '8 · Expanded — a file read', 'the full path the row gave up when it shortened to a basename, plus its length', (
      <ToolRow verb="Read" target="OnboardingClient.tsx" status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'file', path: 'apps/web/src/app/(dashboard)/onboarding/OnboardingClient.tsx', lineCount: 214 }} />
    )),
    frame('shot-9-expanded-shell', '9 · Expanded — a shell command', 'the prompt is drawn, never part of the string a copy would carry', (
      <ToolRow verb="Ran" target="Inspect onboarding store for step order" status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: GREP }} />
    )),
    frame('shot-10-expanded-search', '10 · Expanded — a search, and a raw result', 'the pattern, then what it returned; capped so one row cannot become the panel', (
      <>
        <ToolRow verb="Searched" target="hero-container" status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'search', pattern: 'hero-container', matches: MATCHES }} />
        <ToolRow verb="Used" target="figma — get_design_context" status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: '{\n  "nodes": 3,\n  "frame": "Onboarding / Connect"\n}' }} />
      </>
    )),
    frame('shot-11-strip', '11 · A turn, assembled', 'the register doing its actual job: prose and tool activity as one column of reading', (
      <>
        <Prose>I&rsquo;ll find your onboarding flow now.</Prose>
        <ToolGroupedCommands verb="Explored" status="completed" strings={ROWS} chevronIcon={ForwardIcon} items={[{ description: 'Find the onboarding entry', command: 'rg -l "OnboardingClient" apps/web/src' }, { description: 'List the dashboard routes', command: 'ls apps/web/src/app' }]} />
        <Prose>Let me confirm the step order.</Prose>
        <ToolRow verb="Ran" target="Inspect onboarding store for step order" status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'shell', command: GREP }} />
        <ToolRow verb="Read" target="OnboardingClient.tsx" status="completed" strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'file', path: 'apps/web/src/app/(dashboard)/onboarding/OnboardingClient.tsx', lineCount: 214 }} />
        <Prose>First step is the Connect step. Let me place it on the canvas.</Prose>
        <ToolRow verb="Read canvas" target="0 nodes" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Updated canvas" target="no-op" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
        <ToolRow verb="Captured screenshot" target="pages-onboarding-connect" status="completed" strings={ROWS} chevronIcon={ForwardIcon} />
        <Prose>It&rsquo;s on the canvas — Connect to GitHub is step 1 of the wizard.</Prose>
      </>
    )),
    {
      id: 'shot-12-verb-pair',
      title: '12 · The verb pair, as shipped',
      note: 'past tense with motion alone (left, the reference) vs the progressive form we ship (right); one catalog string apart',
      render: () => (
        <HStack gap={4} vAlign="start">
          <Panel>
            <Text size="xsm" color="secondary">past tense, running</Text>
            <ToolRow verb="Read" target="OnboardingClient.tsx" status="running" strings={ROWS} chevronIcon={ForwardIcon} />
            <ToolFileRow verb="Wrote" fileName="Hero.module.css" status="running" strings={ROWS} />
            <ToolGroupedCommands verb="Explored" status="running" strings={ROWS} chevronIcon={ForwardIcon} items={[{ command: 'ls' }, { command: 'pwd' }]} />
          </Panel>
          <Panel>
            <Text size="xsm" color="secondary">progressive, running</Text>
            <ToolRow verb="Reading" target="OnboardingClient.tsx" status="running" strings={ROWS} chevronIcon={ForwardIcon} />
            <ToolFileRow verb="Writing" fileName="Hero.module.css" status="running" strings={ROWS} />
            <ToolGroupedCommands verb="Exploring" status="running" strings={ROWS} chevronIcon={ForwardIcon} items={[{ command: 'ls' }, { command: 'pwd' }]} />
          </Panel>
        </HStack>
      ),
    },
  ],
};

const LONG_TARGET = 'localhost:5174/dashboard/settings/billing?tab=invoices&range=last-90-days&view=table';
const LONG_FILE = 'use-onboarding-step-order.module.css';

function ChangingToolTarget(): React.JSX.Element {
  const [hasDescription, setHasDescription] = useState(false);
  const command = 'cd ~/Library/Application Support/Onlook/Studio && find . -name "*.png"';
  const input = { command, ...(hasDescription ? { description: 'Finding files in Studio\'s data folder' } : {}) };
  return (
    <VStack gap={2}>
      <ToolCalls calls={[{ toolCallId: 'late-description', name: 'Bash', kind: 'execute', title: 'Bash', status: 'in_progress', displayStatus: 'in_progress', startedAt: 0, input }]} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} />
      <button type="button" data-testid="chat-tool-add-description" onClick={() => setHasDescription(true)}>Receive the description</button>
    </VStack>
  );
}

/** Narrower than the shipped sentence, and outlined, so a crop can tell the row's box from the panel's. */
function Clipped({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      data-testid="tool-row-clip-box"
      style={{ width: 110, outline: 'thin dashed var(--color-border)' }}
    >
      {children}
    </div>
  );
}

const runningClip: Category = {
  id: 'running-clip',
  title: 'A running row longer than its line (ONL-2485)',
  stories: [
    frame('chat-running-changed-target', 'a command gains its description', 'the same running row changes from command to description without keeping old glyphs', <ChangingToolTarget />),
    frame('chat-running-clip-chevron', 'running, expanded', 'the shimmering sentence clips and the chevron stays in the row; the settled twin below is the control. Expanded, because a closed row hides its chevron until hover', (
      <>
        <ToolRow verb="Capturing screenshot" target={LONG_TARGET} status="running" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: LONG_TARGET }} />
        <ToolRow verb="Captured screenshot" target={LONG_TARGET} status="completed" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} detail={{ kind: 'raw', text: LONG_TARGET }} />
        <ToolFileRow verb="Writing" fileName={LONG_FILE} status="running" strings={ROWS} />
        <ToolGroupedFiles verb="Reading" fileNames={['OnboardingClient.tsx', LONG_FILE, 'tokens.css']} overflow={2} status="running" strings={ROWS} />
      </>
    )),
    frame('chat-running-clip-grouped', 'running, in a box narrower than its sentence', 'the grouped row draws its chevron whatever the status, so the box edge is the whole check', (
      <Clipped>
        <ToolGroupedCommands verb="Exploring" status="running" defaultOpen strings={ROWS} chevronIcon={ForwardIcon} items={[{ command: 'ls apps/web/src/app' }, { command: 'pwd' }, { command: 'cat package.json' }]} />
      </Clipped>
    )),
  ],
};

/** The transcript the proof films, whose last reply carries the footer Retry (ONL-2499). */
const SETUP_ROW_ITEMS: TranscriptItem[] = [
  { kind: 'user', id: 's0', text: 'Set this project up so it starts fast next time.' },
  { kind: 'tools', id: 's1', calls: [
    tool('s1a', 'read', 'get project setup', 'get project setup', 'completed'),
    tool('s1b', 'other', 'save project setup', 'save project setup', 'completed'),
    tool('s1c', 'execute', 'run project setup', 'run project setup', 'completed'),
  ] },
  { kind: 'assistant-text', id: 's2', text: 'I saved the setup script and Studio verified it.', isStreaming: false },
];

/** Without `onRetry` the reply's footer Retry renders nowhere and the story reads as aligned while the app indents it (ONL-2499). */
function SetupRowPanel({ hasFailure, hasDuration = false }: { hasFailure: boolean; hasDuration?: boolean }): React.JSX.Element {
  const items = hasDuration
    ? SETUP_ROW_ITEMS.map((item) => (item.id === 's2' ? { ...item, durationMs: 12_300 } : item))
    : SETUP_ROW_ITEMS;
  return (
    <div style={{ width: REGION.end, height: 460, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }}>
      <ChatPanel {...chatPanelProps({
        transcript: { ...still({ ...emptyState, items }), onRetry: noop, copyIcon: glyph(CopyIcon), retryIcon: glyph(ReloadIcon) },
        composer: REST_COMPOSER,
        setup: {
          narration: {
            line: 'Starting', repo: 'acme-storefront', phase: 'starting',
            ...(hasFailure ? { failure: { nextAction: 'Retry starts the project again.', wayOut: { kind: 'retry' as const, label: 'Retry', onAct: noop } } } : {}),
          },
        },
      })} />
    </div>
  );
}

const setupRow: Category = {
  id: 'setup-row',
  title: 'Setup row — the inset it shares with the tool rows above it',
  stories: [
    {
      id: 'chat-setup-row-aligned',
      title: 'the transcript the proof films',
      note: 'the reply\'s Retry inks on the tool rows\' own edge; the copy glyph\'s box is held after it, invisible until hover',
      render: () => <SetupRowPanel hasFailure={false} />,
    },
    {
      id: 'chat-setup-row-duration',
      title: 'the same reply, with a duration',
      note: 'the duration takes the edge and Retry follows it with the row\'s gap — the pull applies only when Retry leads',
      render: () => <SetupRowPanel hasFailure={false} hasDuration />,
    },
    {
      id: 'chat-setup-row-retry',
      title: 'after a transcript, the setup row\'s own Retry in place',
      note: 'the filled control\'s box is its edge, so it aligns without a pull',
      render: () => <SetupRowPanel hasFailure />,
    },
  ],
};

const welcome: Category = {
  id: 'welcome',
  title: 'Welcome turn — the reassurance row',
  stories: [
    {
      id: 'chat-setup-planning',
      title: 'setup — the press lands (ONL-2244)',
      note: 'the source repo, before git has answered',
      render: () => (
        <Panel>
          <SetupTurn line="Reading" repo="acme-storefront" phase="planning" />
        </Panel>
      ),
    },
    {
      id: 'chat-setup-copying',
      title: 'setup — cutting the worktree (ONL-2244)',
      note: 'ONE line that replaces itself; it gives way to the reassurance row below',
      render: () => (
        <Panel>
          <SetupTurn line="Making a copy of" repo="acme-storefront" phase="copying" />
        </Panel>
      ),
    },
    {
      id: 'chat-setup-installing',
      title: 'setup — after the landing (ONL-2179)',
      note: 'the stages inside the workspace sit below the reassurance row',
      render: () => (
        <Panel>
          <WelcomeTurn strings={STRINGS.welcome} workspace={{ sourceRepoName: 'acme-storefront', workspaceName: 'skylark', branchName: 'ldavinci/skylark', baseBranch: 'main' }} />
          <SetupTurn line="Installing dependencies for" repo="acme-storefront" phase="installing" />
        </Panel>
      ),
    },
    {
      id: 'chat-setup-starting',
      title: 'setup — the Start turn (ONL-2179)',
      note: 'the last stage the row names; a live frame ends it and the row gives way',
      render: () => (
        <Panel>
          <WelcomeTurn strings={STRINGS.welcome} workspace={{ sourceRepoName: 'acme-storefront', workspaceName: 'skylark', branchName: 'ldavinci/skylark', baseBranch: 'main' }} />
          <SetupTurn line="Starting" repo="acme-storefront" phase="starting" />
        </Panel>
      ),
    },
    {
      id: 'chat-setup-failed',
      title: 'setup — a stage failed, Retry in place (ONL-2179)',
      note: 'the stage named, the next action, the manager’s own words, no dialog',
      render: () => (
        <Panel>
          <SetupTurn
            line="Could not install dependencies for"
            repo="acme-storefront"
            phase="installing"
            failure={{
              nextAction: 'Retry runs the install again in the copy.',
              wayOut: { kind: 'retry', label: 'Retry', onAct: noop },
              dismissLabel: 'Dismiss',
              onDismiss: noop,
              output: { text: 'error: ERR_PNPM_NO_LOCKFILE\nCannot install with "frozen-lockfile" because pnpm-lock.yaml is absent', showLabel: t('project.create.details.show'), hideLabel: t('project.create.details.hide') },
            }}
          />
        </Panel>
      ),
    },
    {
      id: 'chat-setup-manager-missing',
      title: 'setup — the selected package manager is missing',
      render: () => (
        <Panel>
          <SetupTurn
            line={t('project.create.failed.installing')}
            repo="acme-storefront"
            phase="installing"
            failure={{
              nextAction: t('project.create.next.installing'),
              wayOut: { kind: 'retry', label: t('project.create.retry'), onAct: noop },
              dismissLabel: t('project.create.dismiss'),
              onDismiss: noop,
              detail: t('project.install.managerMissing', { manager: 'bun' }),
            }}
          />
        </Panel>
      ),
    },
    {
      id: 'chat-welcome-branch',
      title: 'copy + branch',
      render: () => (
        <Panel>
          <WelcomeTurn strings={STRINGS.welcome} workspace={{ sourceRepoName: 'react-project-v1', workspaceName: 'skylark', branchName: 'ldavinci/skylark', baseBranch: 'main' }} />
        </Panel>
      ),
    },
    {
      id: 'chat-welcome-copied',
      title: 'copied folder (ONL-2177)',
      note: 'a folder with no git history: the note leads, then the two sentences',
      render: () => (
        <Panel>
          <WelcomeTurn strings={STRINGS.welcome} workspace={{ sourceRepoName: 'lemonade', workspaceName: 'skylark', branchName: 'ldavinci/skylark', baseBranch: 'main', copied: true }} />
        </Panel>
      ),
    },
    {
      id: 'chat-welcome-no-branch',
      title: 'copy only',
      note: 'blank branch fields drop the second sentence',
      render: () => (
        <Panel>
          <WelcomeTurn strings={STRINGS.welcome} workspace={{ sourceRepoName: 'react-project-v1', workspaceName: 'skylark', branchName: '', baseBranch: '' }} />
        </Panel>
      ),
    },
  ],
};

const CONNECTIONS: { id: string; title: string; connection: AgentConnection }[] = [
  { id: 'claude-missing', title: 'Claude · cli_missing', connection: { status: 'cli_missing' } },
  { id: 'claude-error', title: 'Claude · error', connection: { status: 'error', detail: 'spawn ENOENT: claude', harness: 'claude' } },
  { id: 'codex-missing', title: 'Codex · cli_missing', connection: { status: 'cli_missing', harness: 'codex' } },
  { id: 'codex-unauth', title: 'Codex · unauthenticated', connection: { status: 'unauthenticated', harness: 'codex' } },
  { id: 'codex-error', title: 'Codex · error', connection: { status: 'error', harness: 'codex', detail: 'app-server exited 1' } },
];

const noConnection: Category = {
  id: 'no-connection',
  // Claude's signed-out verdict is not here: it draws the sign-in card now
  // (ONL-2187), and lives in the onboarding-ui gallery with the rest of that card.
  title: 'No connection — every verdict a banner still answers',
  stories: [...CONNECTIONS.map((c) => ({
    id: `chat-connection-${c.id}`,
    title: c.title,
    render: () => (
      <Panel>
        <NoConnection connection={c.connection} strings={STRINGS} onRemedy={noop} onDismiss={noop} />
      </Panel>
    ),
  })), ...(['setUpCodex', 'signInCodex'] as const).map((remedy) => ({
    id: `chat-connection-busy-${remedy === 'setUpCodex' ? 'setup' : 'sign-in'}`,
    title: `ChatGPT · ${remedy} in progress`,
    render: () => (
      <Panel>
        <NoConnection connection={{ status: 'unknown', harness: 'codex' }} strings={STRINGS} onRemedy={noop} remedyBusy={remedy} />
      </Panel>
    ),
  }))],
};

const ALWAYS: PermissionOption = { optionId: 'allow_always', label: 'Always allow', kind: 'allow_always' };
const QUESTION = {
  question: 'Which accent should the pricing page use?',
  header: 'Accent',
  options: [
    { label: 'Teal, the product accent the rest of the app already uses (Recommended)', description: 'The product accent' },
    { label: 'Purple', description: 'The marketing accent' },
    { label: 'Neutral', description: 'No colour, words carry it' },
  ],
};

/** The persistent row sits between Approve and Deny, where `permissionOptions` places it. */
function call(
  id: string,
  title: string,
  target: string,
  questions?: Question[],
  persistent: PermissionOption = ALWAYS,
): ToolCallView {
  const base = tool(id, 'execute', title, target, 'awaiting_approval', true);
  const permission = base.permission!;
  return {
    ...base,
    permission: {
      ...permission,
      options: [permission.options[0]!, persistent, ...permission.options.slice(1)],
      ...(questions === undefined ? {} : { questions }),
    },
  };
}

/** The row names the rule the grant writes, not the tool (ONL-2562). */
function covering(id: string, command: string): ToolCallView {
  return call(id, 'Bash', command, undefined, {
    optionId: 'allow_always',
    label: `Always allow ${command}`,
    kind: 'allow_always',
  });
}

const approval: Category = {
  id: 'approval',
  title: 'Approval — the permission round-trip',
  stories: [
    { id: 'chat-approval-run', title: 'run a command', render: () => <Panel><ApprovalRequest call={call('a1', 'Bash', 'gh pr create --fill')} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} /></Panel> },
    {
      id: 'chat-approval-two-options',
      title: 'two options — Approve and Deny (ONL-2562)',
      note: 'the common shape: a tool no rule can hold offers no persistent row, so nothing promises a grant that would not stick',
      render: () => <Panel><ApprovalRequest call={tool('a4', 'execute', 'Bash', 'gh pr create --fill', 'awaiting_approval', true)} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} /></Panel>,
    },
    {
      id: 'chat-approval-always-named',
      title: 'the persistent row, named and clipped (ONL-2562)',
      note: 'a row of its own at the rail’s width: the rule reads in full on the left, and on the right it ellipsises rather than widening the card',
      // Wrapping, so a narrow window moves the second panel rather than shrinking the rail these clip against.
      render: () => (
        <HStack gap={4} vAlign="start" wrap="wrap">
          <Panel>
            <Text size="xsm" color="secondary">a rule the rail holds</Text>
            <ApprovalRequest call={covering('a5', 'touch notes.txt')} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} />
          </Panel>
          <Panel>
            <Text size="xsm" color="secondary">a rule longer than the rail</Text>
            <ApprovalRequest call={covering('a6', 'npm run build --workspace=@studio/app')} strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop} />
          </Panel>
        </HStack>
      ),
    },
    {
      id: 'chat-approval-question-in-panel',
      title: 'two questions in the chat panel (ONL-2583)',
      render: () => (
        <LivePanel
          state={{
            ...panelState(ASKING_ROWS, true, 'steer'),
            awaitingApproval: [ASKING_CALL],
            turnStartedAt: Date.now() - 40_000,
            questionParkedSince: Date.now() - 20_000,
          }}
          strings={PEN_STRINGS}
          height={600}
        />
      ),
    },
  ],
};

const ASKING_CALL = call('a7', 'AskUserQuestion', '', [
  QUESTION,
  {
    question: 'Should the three cards that already use purple switch too?',
    header: 'Cards',
    options: [
      { label: 'Switch them', description: 'Every card matches the new accent' },
      { label: 'Leave them', description: 'Only the hero changes' },
    ],
  },
]);

const ASKING_ROWS: TranscriptItem[] = [
  { kind: 'user', id: 'q0', text: 'Make the pricing page match the new brand.' },
  { kind: 'assistant-text', id: 'q0a', text: 'Two quick choices before I change the page.', isStreaming: false },
  { kind: 'tools', id: 'q1', calls: [ASKING_CALL] },
];

/** The tile's resolving state is a pending resolve, so the still is the same every time. */
const PENDING = (): Promise<string | null> => new Promise<string | null>(() => undefined);

const images: Category = {
  id: 'images',
  title: 'Image thumbnail — resolving, resolved and unavailable',
  stories: [
    { id: 'chat-image-resolving', title: 'resolving', render: () => <ImageThumbnail image={{ id: 'img-0', mediaType: 'image/png', width: 8, height: 8 }} resolve={PENDING} alt={STRINGS.imageAlt} unavailableLabel={STRINGS.imageUnavailable} /> },
    { id: 'chat-image-resolved', title: 'resolved', render: () => <ImageThumbnail image={{ id: 'img-1', mediaType: 'image/png', width: 320, height: 200 }} resolve={() => Promise.resolve(PREVIEW_IMAGE)} alt={STRINGS.imageAlt} unavailableLabel={STRINGS.imageUnavailable} /> },
    { id: 'chat-image-unavailable', title: 'unavailable', render: () => <ImageThumbnail image={{ id: 'img-2', mediaType: 'image/png' }} resolve={() => Promise.resolve(null)} alt={STRINGS.imageAlt} unavailableLabel={STRINGS.imageUnavailable} /> },
  ],
};

const PREVIEW_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#2b4c7e"/><circle cx="90" cy="100" r="54" fill="#e8b04b"/><rect x="170" y="48" width="110" height="104" rx="12" fill="#d9e4f2"/></svg>',
)}`;

const PREVIEW_DRAFT: AttachmentDraft = {
  ref: { id: 'img-draft', mediaType: 'image/png', width: 320, height: 200 },
  name: 'hero-reference.png',
  previewUrl: PREVIEW_IMAGE,
};

function PreviewPanel({ items, drawer, composerValue = '' }: { items: TranscriptItem[]; drawer?: React.ReactNode; composerValue?: string }): React.JSX.Element {
  return (
    <div style={{ width: REGION.end, height: 460, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }}>
      <ChatPanel {...chatPanelProps({
        transcript: { ...still({ ...emptyState, items }), resolveImage: (ref) => Promise.resolve(ref.id === 'img-gone' ? null : PREVIEW_IMAGE) },
        composer: { ...REST_COMPOSER, composerValue, ...(drawer ? { composerSlots: { drawer } } : {}) },
      })} />
    </div>
  );
}

const attachmentPreview: Category = {
  id: 'attachment-preview',
  title: 'Image pill — hover preview, in the composer and in a sent message',
  stories: [
    {
      id: 'chat-attachment-preview-composer',
      title: 'composer chip',
      note: 'hover the chip: the image previews above it',
      render: () => (
        <PreviewPanel
          items={[]}
          drawer={
            <ChatComposerDrawer style={DRAWER_STYLE}>
              <HStack gap={1} vAlign="start" style={{ width: '100%', minWidth: 0, minHeight: 'var(--studio-attachment-pill-height)', overflow: 'hidden', flexWrap: 'wrap' }}>
                <AttachmentChips drafts={[PREVIEW_DRAFT]} onRemove={noop} />
              </HStack>
            </ChatComposerDrawer>
          }
        />
      ),
    },
    {
      id: 'chat-scroll-control',
      title: 'scroll back to the latest message',
      render: () => <PreviewPanel items={Array.from({ length: 24 }, (_, index) => ({ kind: 'user' as const, id: `scroll-${String(index)}`, text: `Message ${String(index + 1)}: match the spacing and colours in the reference.` }))} />,
    },
    {
      id: 'chat-attachment-preview-sent',
      title: 'sent pills · resolved and gone',
      note: 'hover each pill: the first previews its image, the second says it is unavailable',
      render: () => (
        <PreviewPanel
          items={[
            {
              kind: 'user',
              id: 'u-preview',
              text: 'Match the hero to these.',
              attachments: [
                { id: 'img-ok', mediaType: 'image/png', width: 320, height: 200 },
                { id: 'img-gone', mediaType: 'image/png' },
              ],
            },
          ]}
        />
      ),
    },
  ],
};

const DELIVERY_STATES: UserMessageDelivery[] = ['waiting', 'refused', 'discarded'];

/** The whole panel on a fold, props only — the user row and the composer are not exported on their own. */
function panelState(items: TranscriptItem[], isStreaming: boolean, midTurn: SessionState['midTurn']): SessionState {
  return { ...emptyState, items, isStreaming, midTurn };
}

/** The app's own pen copy, so the gallery reviews the shipped sentences (ONL-2294). */
const PEN_STRINGS = { ...STRINGS, pen: penRowStrings('Claude') };
const PREVIEW_RESOLVER = () => Promise.resolve(PREVIEW_IMAGE);

function LivePanel({
  state,
  notice,
  composerValue = '',
  strings = PEN_STRINGS,
  height = 460,
  workingRow,
  notificationSlot,
  picked,
  pictures = false,
}: {
  state: SessionState;
  notice?: ProviderNotice;
  composerValue?: string;
  strings?: typeof PEN_STRINGS;
  height?: number;
  workingRow?: ChatWorkingRow;
  notificationSlot?: React.ReactNode;
  picked?: number;
  pictures?: boolean;
}): React.JSX.Element {
  const nextTaskPictures = useNextTaskPictures(PICTURE_LOADS, state.items, state.isStreaming);
  const [picks, setPicks] = useState<Record<string, { index: number | null }>>(picked === undefined ? {} : { n1: { index: picked } });
  return (
    <div style={{ width: REGION.end, height, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }}>
      <ChatPanel {...chatPanelProps({
        transcript: {
          ...still(state, strings),
          resolveImage: PREVIEW_RESOLVER,
          penActions: { onTake: noop, onDiscard: noop },
          onSkipQuestion: noop,
          onNextTask: noop,
          nextTaskPicks: picks,
          onNextTaskPick: (toolCallId, index) => setPicks((current) => ({ ...current, [toolCallId]: { index } })),
          workingRow,
          ...(pictures ? { nextTaskPictures } : {}),
        },
        composer: { ...REST_COMPOSER, composerValue },
        notices: { notice, ...(notificationSlot ? { notificationSlot } : {}) },
      })} />
    </div>
  );
}

const NEXT_TASKS = [
  { title: 'Rewrite the subhead', line: 'Match the warmer headline above it.' },
  { title: 'Show it on mobile', line: 'Check the hero at phone width.' },
  { title: 'Try two heroes', line: 'One with a photo, one without.' },
];
const offerCall = (input: unknown): ToolCallView => ({
  ...tool('n1', 'other', SUGGEST_NEXT_TASKS_TOOL, '', 'completed'),
  input,
});
const OFFER: TranscriptItem = { kind: 'tools', id: 'n-offer', calls: [offerCall({ tasks: NEXT_TASKS })] };
const LONG_TASKS = [
  { title: 'Give the See our bread button a solid warm fill', line: 'A warm fill, so it leads the eye before the menu does' },
  { title: 'Tighten the four promises', line: 'Shorter lines under each promise, quicker to scan on a phone' },
  { title: 'Rewrite the bakery story', line: 'Same voice as the new line' },
];
const LONG_OFFER: TranscriptItem = { kind: 'tools', id: 'n-offer', calls: [offerCall({ tasks: LONG_TASKS })] };
const MIXED_OFFER: TranscriptItem = {
  kind: 'tools',
  id: 'n-offer',
  calls: [offerCall({ tasks: [NEXT_TASKS[0], { title: 'Show it on mobile' }, NEXT_TASKS[2]] })],
};
const CLIP_ID = '0123456789ab-00000000-0000-4000-8000-000000000001';
const GONE_ID = '0123456789ab-00000000-0000-4000-8000-000000000002';
const CLIP_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="112"><rect width="144" height="112" fill="#f4f1ea"/><rect x="14" y="14" width="96" height="9" rx="2" fill="#2a2622"/><rect x="14" y="31" width="70" height="5" rx="2" fill="#8a837a"/><rect x="14" y="54" width="70" height="26" rx="3" fill="#ffffff" stroke="#2a2622" stroke-width="2"/><rect x="26" y="64" width="46" height="6" rx="2" fill="#2a2622"/></svg>',
)}`;
const PICTURE_LOADS = createPictureLoads({ resolve: () => Promise.resolve(null), peek: ({ id }) => (id === CLIP_ID ? CLIP_IMAGE : null) });
const PICTURE_TASKS = [
  { title: 'Make the button solid', line: 'A warm fill, so it leads' },
  { title: 'Tighten the four promises', line: 'Shorter lines, quicker to scan' },
  { title: 'Rewrite the bakery story', line: 'Same voice as the new line' },
];
const picturedOffer = (pictures: readonly (NextTaskPictureData | null)[], tasks: readonly { title: string; line?: string }[] = PICTURE_TASKS): TranscriptItem => ({
  kind: 'tools',
  id: 'n-offer',
  calls: [{ ...offerCall({ tasks }), result: `Studio is showing these tasks.\n${nextTaskPicturesLine(pictures)}` }],
});
const MIXED_PICTURES = picturedOffer([{ clip: CLIP_ID }, { skeleton: 'row' }, null]);
const ORDER_PAGE_SKETCH: NextTaskPictureData = {
  sketch: [
    { kind: 'outline', x: 30, y: 6, w: 40, h: 88 },
    { kind: 'heading', x: 36, y: 16, w: 22 },
    { kind: 'image', x: 36, y: 28, w: 12, h: 18 },
    { kind: 'text', x: 51, y: 31, w: 13 },
    { kind: 'text', x: 51, y: 39, w: 9 },
    { kind: 'image', x: 36, y: 52, w: 12, h: 18 },
    { kind: 'text', x: 51, y: 55, w: 13 },
    { kind: 'text', x: 51, y: 63, w: 9 },
    { kind: 'block', x: 36, y: 78, w: 28, h: 9 },
  ],
};
const SKETCH_TASKS = [
  { title: 'Add an order page', line: 'Pick loaves, then pay, on a new page' },
  { title: 'Make the button solid', line: 'A warm fill, so it leads' },
  { title: 'Rewrite the bakery story', line: 'Same voice as the new line' },
];
const SKETCHED_PICTURES = picturedOffer([ORDER_PAGE_SKETCH, { clip: CLIP_ID }, { skeleton: 'story' }], SKETCH_TASKS);
const NEXT_EDITED: TranscriptItem[] = [
  { kind: 'user', id: 'n0', text: 'Make the headline warmer' },
  { kind: 'tools', id: 'n-edit', calls: [tool('c1', 'read', 'Read', 'index.html', 'completed'), tool('c2', 'edit', 'Edit', 'index.html', 'completed')] },
  { kind: 'assistant-text', id: 'n-reply', text: 'Done. The headline now reads **Bread worth waking up for**. You can see it in the frame on the canvas.', isStreaming: false, durationMs: 16_200 },
];
const NEXT_THINKING: TranscriptItem = { kind: 'assistant-thinking', id: 'n-think', text: '', isStreaming: true };
const NEXT_DONE: ChatWorkingRow = { phase: 'done', text: 'Done — look at New project' };
const NEXT_TAPPED: TranscriptItem = { kind: 'user', id: 'n-tap', text: NEXT_TASKS[0]!.title, origin: 'suggestion' };
const NEXT_LONG_REPLY: TranscriptItem = {
  kind: 'assistant-text',
  id: 'n-long',
  text: [
    'Done. The subhead now reads **Baked before sunrise, gone by noon**, so it carries the warmer voice of the headline.',
    'I kept it to one line at desktop widths and let it wrap to two on a phone.',
    'The size and color are unchanged, so it still sits quietly under the headline.',
    'The line height is a touch tighter, which keeps the pair reading as one block.',
    'You can see it in the frame on the canvas.',
  ].join('\n\n'),
  isStreaming: false,
  durationMs: 12_400,
};
const USER_BUBBLE_ITEMS: TranscriptItem[] = [
  { kind: 'user', id: 'w-typed', text: 'Make the headline warmer' },
  { kind: 'assistant-text', id: 'w-typed-reply', text: 'Done. The headline reads warmer now.', isStreaming: false, durationMs: 4_100 },
  { kind: 'user', id: 'w-welcome', text: 'I want to map out a user flow.' },
  { kind: 'assistant-text', id: 'w-welcome-reply', text: 'Naming the project, then a quick round of questions so I know whose flow this is.', isStreaming: false, durationMs: 5_700 },
  { kind: 'user', id: 'w-long', text: 'Rewrite the hero so it speaks to bakers who open before dawn, keep the photo, and make the button say what happens when they press it.' },
  { kind: 'assistant-text', id: 'w-long-reply', text: 'Rewrote the hero for early bakers.', isStreaming: false, durationMs: 9_300 },
];
const PENDING_INVITATION =<NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'pending' }} onAction={noop} />;

const nextTasks: Category = {
  id: 'next-tasks',
  title: 'Next tasks (ONL-2899)',
  stories: [
    { id: 'chat-next-tasks-suggested', title: 'open: nothing picked, no Confirm (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER], false, 'steer')} workingRow={NEXT_DONE} height={560} /> },
    { id: 'chat-next-tasks-moved', title: 'after a tap: the task picked, the others dimmed, Confirm under them (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER], false, 'steer')} picked={1} height={560} /> },
    { id: 'chat-next-tasks-long', title: 'long text: a line that runs out fades, and hovering shows it in full above (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, LONG_OFFER], false, 'steer')} height={560} /> },
    { id: 'chat-next-tasks-long-picked', title: 'long text after a tap: the fade holds on the picked and the dimmed tasks (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, LONG_OFFER], false, 'steer')} picked={0} height={560} /> },
    { id: 'chat-turn-foot', title: 'the turn’s foot: duration and copy under Confirm, shown on hover (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER], false, 'steer')} picked={0} height={560} /> },
    { id: 'chat-next-tasks-mixed', title: 'mixed: a task with no line beside tasks with one (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, MIXED_OFFER], false, 'steer')} height={560} /> },
    { id: 'chat-next-tasks-pictures', title: 'pictures, a mixed set: a clip, a sketch, text only (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, MIXED_PICTURES], false, 'steer')} pictures height={560} /> },
    { id: 'chat-next-tasks-pictures-picked', title: 'pictures, the text-only task picked: the pictured ones dim with their tiles (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, MIXED_PICTURES], false, 'steer')} pictures picked={2} height={560} /> },
    { id: 'chat-next-tasks-pictures-sent', title: 'pictures, sent: the chosen task stays with its picture (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, MIXED_PICTURES, { kind: 'user', id: 'n-tap', text: PICTURE_TASKS[0]!.title, origin: 'suggestion' }, NEXT_THINKING], true, 'steer')} pictures height={560} /> },
    { id: 'chat-next-tasks-pictures-agent-sketch', title: 'pictures: the agent’s sketch of a new page, a clip, a stock fallback (ONL-2959)', render: () => <LivePanel state={panelState([...NEXT_EDITED, SKETCHED_PICTURES], false, 'steer')} pictures height={560} /> },
    { id: 'chat-next-tasks-pictures-sketches', title: 'pictures, every sketch: button, row, story (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, picturedOffer([{ skeleton: 'button' }, { skeleton: 'row' }, { skeleton: 'story' }])], false, 'steer')} pictures height={560} /> },
    { id: 'chat-next-tasks-pictures-gone', title: 'pictures, a clip whose bytes are gone: that task shows as text (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, picturedOffer([{ clip: GONE_ID }, { skeleton: 'row' }, { clip: CLIP_ID }])], false, 'steer')} pictures height={560} /> },
    { id: 'chat-next-tasks-pictures-long', title: 'pictures, long text: the fade stops at the tile (ONL-2977)', render: () => <LivePanel state={panelState([...NEXT_EDITED, picturedOffer([{ clip: CLIP_ID }, { skeleton: 'row' }, { skeleton: 'story' }], LONG_TASKS)], false, 'steer')} pictures height={560} /> },
    {
      id: 'chat-next-tasks-tapped',
      title: 'tapped: the task sends as the designer’s message, drawn as no bubble',
      render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER, NEXT_TAPPED, NEXT_THINKING], true, 'steer')} height={560} />,
    },
    {
      id: 'chat-next-tasks-pinned',
      title: 'tapped, scrolled past: the tapped task is the pinned prompt',
      render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER, NEXT_TAPPED, NEXT_LONG_REPLY], false, 'steer')} height={420} />,
    },
    {
      id: 'chat-user-bubble-widths',
      title: 'a prompt’s bubble hugs its text: a typed line, a welcome row’s line, a long prompt',
      render: () => <LivePanel state={panelState(USER_BUBBLE_ITEMS, false, 'steer')} height={620} />,
    },
    {
      id: 'chat-next-tasks-holds-notification',
      title: 'a turn with the card: the notifications invitation waits',
      render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER], false, 'steer')} notificationSlot={PENDING_INVITATION} height={560} />,
    },
    {
      id: 'chat-next-tasks-notification-later',
      title: 'a later turn with no card: the invitation shows',
      render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER, { kind: 'user', id: 'n-own', text: 'Make the Order ahead button teal' }, { kind: 'assistant-text', id: 'n-own-reply', text: 'Done. The Order ahead button is teal now.', isStreaming: false, durationMs: 8_100 }], false, 'steer')} notificationSlot={PENDING_INVITATION} height={560} />,
    },
    {
      id: 'chat-next-tasks-moved-on',
      title: 'moved on: their own prompt removes the card',
      render: () => <LivePanel state={panelState([...NEXT_EDITED, OFFER, { kind: 'user', id: 'n-own', text: 'Make the Order ahead button teal' }, NEXT_THINKING], true, 'steer')} height={560} />,
    },
    {
      id: 'chat-next-tasks-codex',
      title: 'codex-shaped call: arguments inside the call item',
      render: () => <LivePanel state={panelState([...NEXT_EDITED, { kind: 'tools', id: 'n-offer', calls: [offerCall({ tool: 'suggest_next_tasks', arguments: { tasks: NEXT_TASKS } })] }], false, 'steer')} height={560} />,
    },
    {
      id: 'chat-next-tasks-no-reply',
      title: 'no reply text: the card sits where the call was',
      render: () => <LivePanel state={panelState([NEXT_EDITED[0]!, { kind: 'tools', id: 'n-edit', calls: [...(NEXT_EDITED[1] as Extract<TranscriptItem, { kind: 'tools' }>).calls, offerCall({ tasks: NEXT_TASKS })] }], false, 'steer')} height={560} />,
    },
  ],
};

const deliveryRows: TranscriptItem[] = [
  { kind: 'user', id: 'd0', text: 'Make the hero two columns.' },
  { kind: 'assistant-text', id: 'd0a', text: 'Switching the hero to a two-column grid at desktop widths', isStreaming: true },
  ...DELIVERY_STATES.map((delivery, i): TranscriptItem => ({
    kind: 'user',
    id: `d${String(i + 1)}`,
    text: `And keep the CTA above the fold (${delivery}).`,
    delivery,
  })),
];

const delivery: Category = {
  id: 'delivery',
  title: 'Delivery — the mid-turn user row (ONL-2180)',
  stories: [
    {
      id: 'chat-delivery-states',
      title: 'every chip a row can still show',
      note: 'waiting · refused · discarded; a delivered or steering prompt shows no chip — the first row here',
      render: () => <LivePanel state={panelState(deliveryRows, true, 'steer')} />,
    },
    {
      id: 'chat-composer-streaming-steer',
      title: 'composer while streaming — the runtime steers',
      note: 'Stop shown; Enter sends and the row confirms',
      render: () => <LivePanel state={panelState(deliveryRows.slice(0, 2), true, 'steer')} />,
    },
    {
      id: 'chat-composer-streaming-refuse',
      title: 'composer while streaming — the runtime refused once',
      note: 'Stop shown; Enter is blocked and the wait hint names the runtime (ONL-2052)',
      render: () => <LivePanel state={panelState(deliveryRows.slice(0, 2), true, 'refuse')} />,
    },
  ],
};

/** The app's own sentences, so the gallery reviews what ships (ONL-2925). */
const codexErrors: Category = {
  id: 'codex-errors',
  title: 'ChatGPT — the rows a runtime change can put up (ONL-2925)',
  stories: [
    {
      id: 'chat-codex-not-running',
      title: 'a prompt that never reached ChatGPT',
      note: 'the chip says it was not sent, so the row under it says only the cause',
      render: () => (
        <LivePanel
          state={panelState([
            { kind: 'user', id: 'c0', text: 'Make the hero two columns.' },
            { kind: 'assistant-text', id: 'c0a', text: 'Switched the hero to a two-column grid at desktop widths.', isStreaming: false },
            { kind: 'user', id: 'c1', text: 'Keep this project working after the runtime update.', delivery: 'discarded' },
            { kind: 'error', id: 'c2', message: t('chat.codex.notRunning'), code: 'unknown' },
          ], false, 'steer')}
        />
      ),
    },
    {
      id: 'chat-codex-cannot-continue',
      title: 'the saved conversation ChatGPT would not resume',
      note: 'the rows stay; the boundary marks where ChatGPT’s memory of them ends, with nothing to act on',
      render: () => (
        <LivePanel
          state={panelState([
            { kind: 'user', id: 'r0', text: 'Make the hero two columns.' },
            { kind: 'assistant-text', id: 'r0a', text: 'Switched the hero to a two-column grid at desktop widths.', isStreaming: false },
            { kind: 'boundary', id: 'r1', message: t('chat.codex.cannotContinue') },
          ], false, 'steer')}
        />
      ),
    },
    {
      id: 'chat-codex-cannot-continue-after-prompt',
      title: 'the same loss, with a message already sent during the install',
      note: 'that message opens the new conversation, so the line under it says so',
      render: () => (
        <LivePanel
          state={panelState([
            { kind: 'user', id: 'p0', text: 'Make the hero two columns.' },
            { kind: 'assistant-text', id: 'p0a', text: 'Switched the hero to a two-column grid at desktop widths.', isStreaming: false },
            { kind: 'user', id: 'p1', text: 'Keep this project working after the runtime update.' },
            { kind: 'boundary', id: 'p2', message: t('chat.codex.cannotContinueAfterPrompt') },
          ], true, 'steer')}
        />
      ),
    },
    {
      id: 'chat-codex-cannot-continue-after-failure',
      title: 'the same boundary under a turn that had already failed',
      note: 'the old failure keeps its Retry; the boundary below it is still drawn, and offers none',
      render: () => (
        <LivePanel
          state={panelState([
            { kind: 'user', id: 'f0', text: 'Keep this project working after the runtime update.' },
            { kind: 'error', id: 'f1', message: t('chat.codex.notRunning'), code: 'unknown', retry: { text: 'Keep this project working after the runtime update.' } },
            { kind: 'boundary', id: 'f2', message: t('chat.codex.cannotContinue') },
          ], false, 'steer')}
        />
      ),
    },
  ],
};

const TIMER_ROWS: TranscriptItem[] = [
  { kind: 'user', id: 'q0', text: 'Give me three variations of the hero.' },
  { kind: 'assistant-text', id: 'q0a', text: 'Looking at the hero now', isStreaming: true },
];

const turnTimer: Category = {
  id: 'turn-timer',
  title: 'Turn timer — working, and waiting on you (ONL-2295)',
  stories: [
    {
      id: 'chat-turn-timer-working',
      title: 'the agent is working',
      note: 'the elapsed readout counts',
      render: () => {
        const now = Date.now();
        return <LivePanel state={{ ...panelState(TIMER_ROWS, true, 'steer'), turnStartedAt: now - 32_000 }} />;
      },
    },
    {
      id: 'chat-turn-timer-waiting',
      title: 'the agent is holding a question',
      note: 'the number is replaced by the phrase and stops moving; it resumes at 32s, not at the wall clock',
      render: () => {
        const now = Date.now();
        return (
          <LivePanel
            state={{
              ...panelState(TIMER_ROWS, true, 'steer'),
              turnStartedAt: now - 122_000,
              questionParkedSince: now - 90_000,
            }}
          />
        );
      },
    },
    {
      id: 'chat-turn-timer-resumed',
      title: 'answered, with the wait taken out',
      note: 'a turn 122s old that waited 90s reads about 32s',
      render: () => {
        const now = Date.now();
        return (
          <LivePanel
            state={{
              ...panelState(TIMER_ROWS, true, 'steer'),
              turnStartedAt: now - 122_000,
              turnWaitedMs: 90_000,
            }}
          />
        );
      },
    },
  ],
};

const PEN_PROMPT ='And keep the CTA above the fold on mobile — it drops below it at 390px.';

const penTurnRows: TranscriptItem[] = [
  { kind: 'user', id: 'p0', text: 'Make the hero two columns.' },
  { kind: 'assistant-text', id: 'p0a', text: 'Switching the hero to a two-column grid at desktop widths', isStreaming: true },
];

const PEN_QUESTION_CALL = call('p-ask', 'AskUserQuestion', '', [QUESTION]);

/** The delivery chip and the pen row at once, so the two wordings are reviewed side by side. */
const penQuestionRows: TranscriptItem[] = [
  ...penTurnRows,
  { kind: 'tools', id: 'p1', calls: [PEN_QUESTION_CALL] },
  { kind: 'user', id: 'p2', text: 'Use the teal accent.', delivery: 'waiting' },
];

const penSettledRows: TranscriptItem[] = [
  penTurnRows[0]!,
  { kind: 'assistant-text', id: 'p0a', text: 'The hero is two columns at desktop widths now.', isStreaming: false },
];

function penState(
  items: TranscriptItem[],
  isStreaming: boolean,
  pen: PenView,
  awaitingApproval: ToolCallView[] = [],
): SessionState {
  return { ...panelState(items, isStreaming, 'steer'), pen, awaitingApproval };
}

const pen: Category = {
  id: 'pen',
  title: 'The waiting prompt — every state its label names (ONL-2294)',
  stories: [
    {
      id: 'chat-pen-image-and-text',
      title: 'an image queued with a message',
      render: () => <LivePanel state={penState(penTurnRows, true, { penId: 6, text: 'Match this image.', attachments: [PREVIEW_DRAFT.ref] })} />,
    },
    {
      id: 'chat-pen-working',
      title: 'a turn is live and nothing is parked',
      note: 'the last row of the transcript’s message list, muted and outlined so it does not read as sent; Edit and Discard arrive on hover and there is no send control',
      render: () => <LivePanel state={penState(penTurnRows, true, { penId: 1, text: PEN_PROMPT })} />,
    },
    {
      id: 'chat-pen-question',
      title: 'a question is parked',
      note: 'the prompt waits behind the question, not behind the agent finishing; the delivery chip above it is a different surface and must not read the same',
      render: () => (
        <LivePanel
          state={penState(penQuestionRows, true, { penId: 2, text: PEN_PROMPT }, [PEN_QUESTION_CALL])}
        />
      ),
    },
    {
      id: 'chat-pen-not-sent',
      title: 'nothing is running',
      note: 'a latched hold: the turn ended without releasing it, so the row says where the prompt is going rather than asking for a decision',
      render: () => (
        <LivePanel state={penState(penSettledRows, false, { penId: 3, text: PEN_PROMPT, verdict: 'hold' })} />
      ),
    },
    {
      id: 'chat-pen-returning',
      title: 'a prompt on its way back, over a composer that is not empty',
      note: 'the return appends, so the row is read beside the words it is about to join',
      render: () => (
        <LivePanel
          state={penState(penSettledRows, false, { penId: 5, text: PEN_PROMPT, verdict: 'hold' })}
          composerValue="Tighten the nav while you are in there."
        />
      ),
    },
    {
      id: 'chat-pen-attachments-only',
      title: 'a send that carried no message',
      note: 'mid-turn Enter on attachments alone: the row names the count, so it is never a blank card',
      render: () => (
        <LivePanel
          state={penState(penTurnRows, true, {
            penId: 4,
            text: '',
            attachments: [{ id: 'img-pen-1', mediaType: 'image/png' }],
          })}
        />
      ),
    },
  ],
};

const NOTICE_ROWS: TranscriptItem[] = [{ kind: 'user', id: 'p0', text: 'Make the hero two columns.' }];

/** The sentence comes from the shipping resolver, so a frame cannot drift from the catalog (ONL-2491). */
function noticeStory(id: string, title: string, note: string, fields: (now: number) => Partial<SessionState>): Story {
  return {
    id,
    title,
    note,
    render: () => {
      const now = Date.now();
      const state: SessionState = { ...panelState(NOTICE_ROWS, true, 'steer'), turnStartedAt: now - 32_000, ...fields(now) };
      return <LivePanel state={state} notice={providerNotice(state, now)} />;
    },
  };
}

const providerNoticeRow: Category = {
  id: 'provider-notice',
  title: 'Provider notice — the turn that is failing or silent (ONL-2491)',
  stories: [
    noticeStory('chat-notice-retry-grace', 'a brief provider retry', 'ordinary working feedback while an automatic retry recovers', (now) => ({
      retrying: { attempt: 1, status: 529 },
      retryingSince: now - 2_000,
    })),
    noticeStory('chat-notice-retry-attempt', 'a retry the backend counted', 'the turn timer keeps counting beside it; Stop stays in reach', (now) => ({
      retrying: { attempt: 2, status: 529 },
      retryingSince: now - 10_000,
    })),
    noticeStory('chat-notice-retry-plain', 'a retry nothing counted', 'every codex retry: no attempt, and no denominator invented for it', (now) => ({
      retrying: { status: null },
      retryingSince: now - 10_000,
    })),
    noticeStory('chat-notice-credential-attempt', 'a refused credential, counted', 'the cause the backend reported, never "not responding"', () => ({
      retrying: { attempt: 3, status: 403, kind: 'cloud_credential_error' },
    })),
    noticeStory('chat-notice-credential-plain', 'a refused credential, uncounted', 'an authentication failure at 401/403 reads the same', () => ({
      retrying: { status: 401, kind: 'authentication_failed' },
    })),
    noticeStory('chat-notice-silent', 'nothing heard since the turn began', 'the fact only — the elapsed count is the timer’s', (now) => ({
      silentSince: now - STALL_NOTICE_MS - 7_000,
    })),
  ],
};

/** The panel's narrow floor, where the bottom row's shrink order is decided. */
const NARROW_PANEL = 280;

/** What the Claude backend publishes as enforced (ONL-2190). */
const CLAUDE_MODES: PermissionMode[] = ['default', 'acceptEdits', 'auto', 'plan'];

/** The real panel at the narrow floor, so the row's cap and shrink order are the shipped ones, not a copy. */
function composerBottomRow(mode: PermissionMode, offered: PermissionMode[]): React.JSX.Element {
  const models = composerControls({
    harness: 'claude',
    models: FIXTURE_MODELS,
    model: undefined,
    effort: undefined,
    setModel: noop,
    setEffort: noop,
  });
  return (
    <div
      style={{
        width: NARROW_PANEL,
        height: 260,
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
        overflow: 'hidden',
      }}
    >
      <ChatPanel {...chatPanelProps({
        transcript: still(emptyState),
        composer: {
          ...REST_COMPOSER,
          permission: { control: permissionModeControls({ mode, offered, setMode: noop }) },
          composerSlots: { footer: modelMenuFooter({ harness: undefined, controls: models }) },
        },
      })} />
    </div>
  );
}

const composerRow: Category = {
  id: 'composer-row',
  title: 'Composer bottom row — the two controls at the narrow floor (ONL-2190)',
  stories: [
    {
      id: 'chat-composer-row-modes',
      title: 'four offered modes — selectable',
      note: 'at 280 the line must not wrap: the model control ellipsises first, the mode control holds',
      render: () => composerBottomRow('auto', CLAUDE_MODES),
    },
    {
      id: 'chat-composer-row-one-mode',
      title: 'one offered mode — disabled',
      note: 'a backend that enforces one posture offers no choice: the trigger states it and opens nothing',
      render: () => composerBottomRow('danger-full-access', ['danger-full-access']),
    },
  ],
};

const BUBBLE_STRINGS: InlineElementBubbleStrings = {
  placeholder: 'Ask about this element',
};

const BUBBLE_CAP_REFUSED = `You can add up to ${String(MAX_ELEMENT_SELECTIONS)} elements at a time`;
const BUBBLE_SEND_FAILED = 'That didn’t send. Your message is still here — press send to try again.';

const BUBBLE_DRAFT = 'Why is this heading grey?';
const BUBBLE_TWO_LINE_DRAFT = 'Why is this heading grey instead of the darkest ink we use elsewhere?';
const BUBBLE_LONG_DRAFT = [
  'This heading is grey and the same heading on the pricing page is not.',
  '',
  'Match it to the pricing page: the darkest ink step, the same weight, and the',
  'same line height, and leave the letter spacing alone.',
  '',
  'Check the dark theme before you call it done — the grey there is a different token.',
].join('\n');

const BUBBLE_TAGS = ['h1', 'p', 'button', 'img', 'section', 'ul', 'li', 'span', 'a', 'footer'];

function selected(tag: string, stale = false): ElementSelection {
  return {
    evidence: {
      kind: 'element',
      id: `el-${tag}`,
      tag,
      domPath: `main:nth-of-type(1) > section:nth-of-type(1) > ${tag}:nth-of-type(1)`,
      outerHtmlSnippet: `<${tag} class="hero-title">Ship faster</${tag}>`,
      textContent: 'Ship faster',
      classes: ['hero-title'],
      frameUrl: 'http://localhost:5174/',
    },
    frameNodeId: 'frame-1',
    stale,
  };
}

/** `ChatRegion`'s own drawer, so the gallery reviews the real chips (ONL-2455). */
function chipDrawer(selections: ElementSelection[], drafts: AttachmentDraft[] = []): React.ReactNode {
  return (
    <ChatComposerDrawer
      data-testid="inline-bubble-chip-drawer"
      style={DRAWER_STYLE}
    >
      <InlineChipRow chips={selections} attachments={drafts} onRemove={noop} onRemoveAttachment={noop} />
    </ChatComposerDrawer>
  );
}

const BUBBLE_WIDTH = 280;

const NOTIONAL_ANCHOR: React.CSSProperties = {
  width: BUBBLE_WIDTH,
  height: 56,
  borderRadius: 'var(--radius-element)',
  border: 'thin dashed var(--color-border)',
  background: 'var(--color-background-gray)',
};

/** The layer's box the `inline` surface declines to set, and the anchor it sits off. */
function Anchored({ placement, children }: { placement: 'above' | 'below'; children: React.ReactNode }): React.JSX.Element {
  const anchor = <div style={NOTIONAL_ANCHOR} data-testid="inline-bubble-anchor" />;
  return (
    <VStack gap={2} style={{ position: 'relative', width: BUBBLE_WIDTH, flex: '0 0 auto' }}>
      {placement === 'below' ? anchor : null}
      <div className="inline-morph-content" style={{ width: BUBBLE_WIDTH, borderRadius: 'var(--inline-bubble-radius)', overflow: 'hidden', background: 'var(--color-background-surface)' }}>{children}</div>
      {placement === 'above' ? anchor : null}
    </VStack>
  );
}

function bubble(
  id: string,
  title: string,
  note: string,
  props: Partial<InlineElementBubbleProps>,
  placement: 'above' | 'below' = 'above',
): Story {
  return {
    id,
    title,
    note,
    render: () => (
      <Anchored placement={placement}>
        <InlineElementBubble
          strings={BUBBLE_STRINGS}
          draft=""
          onDraftChange={noop}
          onSubmit={noop}
          onDismiss={noop}
          surface="inline"
          sendIcon={<Icon icon={SendArrowIcon} />}
          {...props}
        />
      </Anchored>
    ),
  };
}

const inlineBubble: Category = {
  id: 'inline-bubble',
  title: 'Inline element bubble — every named state (ONL-2455)',
  stories: [
    bubble(
      'chat-inline-bubble-resting',
      'resting — one row, nothing typed',
      'surface="inline" on every story here: the layer path draws into the browser top layer, where a dozen open stories would stack in one place over the showroom',
      {},
    ),
    bubble(
      'chat-inline-bubble-draft',
      'a single-line draft',
      'send lights up on the first character',
      { draft: BUBBLE_DRAFT },
    ),
    bubble(
      'chat-inline-bubble-draft-two-lines',
      'a draft that wrapped to two lines',
      'the input takes the whole row and send drops under it, right-aligned',
      { draft: BUBBLE_TWO_LINE_DRAFT },
    ),
    bubble(
      'chat-inline-bubble-draft-two-lines-chip',
      'two lines over a chip',
      'the chip drawer, the wrapped input and the dropped send in one card',
      { draft: BUBBLE_TWO_LINE_DRAFT, drawer: chipDrawer([selected('h1')]) },
    ),
    bubble(
      'chat-inline-bubble-draft-growing',
      'a draft at the scroll ceiling',
      'the input grows to 8 rows and then scrolls; the gallery surface is not the layer, so the bubble growing in place is proven by the driven check',
      { draft: BUBBLE_LONG_DRAFT },
    ),
    bubble(
      'chat-inline-bubble-one-chip',
      'one chip',
      'the app’s own ElementChips row through the drawer slot; the remove affordance is the chip’s leading glyph',
      { draft: BUBBLE_DRAFT, drawer: chipDrawer([selected('h1')]) },
    ),
    bubble(
      'chat-inline-bubble-many-chips',
      'chips at the cap',
      'ten: the row wraps and the bubble keeps its width',
      { draft: 'Give these the same spacing.', drawer: chipDrawer(BUBBLE_TAGS.map((tag) => selected(tag))) },
    ),
    bubble(
      'chat-inline-bubble-stale-chip',
      'a stale chip',
      'dimmed and dashed, and it still sends its evidence — a stale chip is not a stale anchor',
      { draft: BUBBLE_DRAFT, drawer: chipDrawer([selected('h1'), selected('button', true)]) },
    ),
    bubble(
      'chat-inline-bubble-cap-refused',
      'the cap refusal',
      'a warning band: the gather was refused, nothing failed, and the draft is still sendable',
      {
        draft: 'Give these the same spacing.',
        drawer: chipDrawer(BUBBLE_TAGS.map((tag) => selected(tag))),
        status: { type: 'warning', message: BUBBLE_CAP_REFUSED },
      },
    ),
    bubble(
      'chat-inline-bubble-send-failed',
      'the send failed',
      'an error band, assertive; the draft stands and send stays live for the retry',
      { draft: BUBBLE_DRAFT, status: { type: 'error', message: BUBBLE_SEND_FAILED } },
    ),
    bubble(
      'chat-inline-bubble-flipped',
      'flipped below its anchor',
      'placement is the app’s, never the bubble’s: the gallery surface is not the layer, so the real flip is proven by the driven check',
      { draft: BUBBLE_DRAFT },
      'below',
    ),
    bubble(
      'chat-inline-bubble-pasted-image',
      'a pasted image, nothing typed',
      'the main chat’s own pill in the bubble’s drawer; hover it for the X, and ⌥ does not fade the surface while it is held',
      { drawer: chipDrawer([], [PREVIEW_DRAFT]) },
    ),
    bubble(
      'chat-inline-bubble-pasted-image-refused',
      'a pasted image beside a refusal',
      'the pill that attached stands while the band names the file that did not',
      {
        drawer: chipDrawer([], [PREVIEW_DRAFT]),
        status: attachFailureStatus({ reason: 'too-large', name: 'poster-4k.png' }),
      },
    ),
    bubble(
      'chat-inline-bubble-session-unusable',
      'an unusable session',
      'the composer is disabled and send is quiet; Escape still dismisses',
      { draft: BUBBLE_DRAFT, isSessionUsable: false },
    ),
  ],
};

const ACTION_PROMPT: TranscriptItem = { kind: 'user', id: 'actions-user', text: 'Match the header to this reference.', attachments: [{ ...PREVIEW_DRAFT.ref, name: PREVIEW_DRAFT.name }] };
const ACTION_REPLY: TranscriptItem = { kind: 'assistant-text', id: 'actions-reply', text: 'Updated the header.\n\n```css\n.header { color: teal; }\n```', isStreaming: false, durationMs: 1200 };

const ACTION_ITEMS: TranscriptItem[] = [ACTION_PROMPT, ACTION_REPLY];

/** The same pair with Studio's own opening prompt in place of the designer's. */
const STUDIO_ACTION_ITEMS: TranscriptItem[] = [{ ...ACTION_PROMPT, origin: 'studio' }, ACTION_REPLY];

/** No attachment and enough prose to fill the bubble: the words wrap around the row rather than under it. */
const PROSE_ACTION_ITEMS: TranscriptItem[] = [
  { kind: 'user', id: 'actions-prose', text: 'Match the header to the reference and keep the nav spacing even at every breakpoint, including the one where the logo wraps.' },
  ACTION_REPLY,
];

/** A token with nowhere to break overflows its line box, which is the one thing that can reach under the row. */
const LONG_TOKEN_ACTION_ITEMS: TranscriptItem[] = [
  { kind: 'user', id: 'actions-long-token', text: 'Take the values from https://example.internal/design/tokens/spacing-and-radius-reference-v4.json' },
  ACTION_REPLY,
];

/** A first row carrying every chip kind at once, under a short prompt and a long one: the case where the actions ride over a chip. */
const CHIP_ATTACHMENTS: PromptAttachment[] = [
  { ...PREVIEW_DRAFT.ref, name: PREVIEW_DRAFT.name },
  { kind: 'element', id: 'el-h1', tag: 'h1', domPath: 'html > body:nth-of-type(1) > h1:nth-of-type(1)', outerHtmlSnippet: '<h1>Studio Notes</h1>', textContent: 'Studio Notes', classes: ['title'], frameUrl: 'http://localhost:41874/' },
  { kind: 'frame', name: 'localhost:41874' },
];
const CHIPS_ACTION_ITEMS: TranscriptItem[] = [
  // A row the bubble holds whole, so the gap the controls keep is readable.
  { kind: 'user', id: 'actions-chips-fits', text: 'Again.', attachments: CHIP_ATTACHMENTS.slice(1, 2) },
  { kind: 'user', id: 'actions-chips-short', text: 'Tighten this.', attachments: CHIP_ATTACHMENTS },
  { kind: 'user', id: 'actions-chips-long', text: 'Match the header to the reference and keep the nav spacing even at every breakpoint, including the one where the logo wraps.', attachments: CHIP_ATTACHMENTS },
  ACTION_REPLY,
];

/** More chips than the bubble can hold: the row scrolls rather than wrapping, and the actions ride above its end. */
const SCROLL_ACTION_ITEMS: TranscriptItem[] = [
  {
    kind: 'user',
    id: 'actions-chips-scroll',
    text: 'Use all of these references for the header, and keep the nav spacing even at every breakpoint.',
    attachments: [
      { ...PREVIEW_DRAFT.ref, name: PREVIEW_DRAFT.name },
      { ...PREVIEW_DRAFT.ref, id: 'img-nav', name: 'nav-and-footer-reference.png' },
      ...CHIP_ATTACHMENTS.slice(1),
    ],
  },
  ACTION_REPLY,
];

/** Past the clamp's eight lines: the row rides at the top, the fade stays at the bottom. */
const CLAMPED_ACTION_ITEMS: TranscriptItem[] = [
  { kind: 'user', id: 'actions-clamped', text: Array.from({ length: 12 }, (_, line) => `Line ${String(line + 1)} of a prompt long enough to be clamped.`).join('\n') },
  ACTION_REPLY,
];

const ACTION_ITEMS_BY_MODE: Partial<Record<string, TranscriptItem[]>> = {
  studio: STUDIO_ACTION_ITEMS, prose: PROSE_ACTION_ITEMS, 'long-token': LONG_TOKEN_ACTION_ITEMS, clamped: CLAMPED_ACTION_ITEMS,
  chips: CHIPS_ACTION_ITEMS, 'chips-hover': CHIPS_ACTION_ITEMS, 'chips-focus': CHIPS_ACTION_ITEMS,
  'chips-scroll': SCROLL_ACTION_ITEMS,
};

const ACTION_PANEL_STYLE = { width: REGION.end, height: 460, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' } as const;

function MessageActionPanel({ mode }: { mode: 'default' | 'hover' | 'prose' | 'long-token' | 'clamped' | 'chips' | 'chips-hover' | 'chips-focus' | 'chips-scroll' | 'focus' | 'disabled' | 'recalled' | 'missing' | 'copied' | 'code-focus' | 'studio' }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(mode === 'recalled' || mode === 'missing' ? 'Match the header to this reference.' : '');
  useEffect(() => {
    // The ring is the keyboard's: `trackInputModality` rests on `pointer`, and the app hides rings there.
    if (mode === 'focus' || mode === 'code-focus' || mode === 'chips-focus') document.documentElement.dataset.input = 'keyboard';
    if (mode === 'focus' || mode === 'chips-focus') root.current?.querySelector<HTMLButtonElement>('[data-testid="chat-user-retry"]')?.focus();
    if (mode === 'code-focus') root.current?.querySelector<HTMLButtonElement>('[data-role="assistant"] button[aria-label="Copy code"]')?.focus();
    if (mode === 'copied') {
      const button = root.current?.querySelector<HTMLButtonElement>('[data-testid="chat-user-actions"] [data-testid="chat-response-copy"]');
      button?.click();
      const timer = setInterval(() => button?.click(), 1000);
      return () => clearInterval(timer);
    }
  }, [mode]);
  return (
    <div ref={root} data-actions-mode={mode} style={mode.startsWith('chips') ? { ...ACTION_PANEL_STYLE, height: 620 } : ACTION_PANEL_STYLE}>
      <style>{['hover', 'prose', 'long-token', 'clamped', 'chips-hover', 'chips-scroll', 'disabled', 'copied', 'studio'].map((shown) => `[data-actions-mode="${shown}"] .chat-message-actions`).join(', ')}{' { opacity: 1; pointer-events: auto; }'}</style>
      <ChatPanel {...chatPanelProps({
        transcript: { ...still({ ...emptyState, items: ACTION_ITEMS_BY_MODE[mode] ?? ACTION_ITEMS, isStreaming: mode === 'disabled' }), onRetry: noop, copyIcon: glyph(CopyIcon), retryIcon: glyph(ReloadIcon), resolveImage: () => Promise.resolve(PREVIEW_IMAGE) },
        composer: {
          ...REST_COMPOSER,
          composerValue: text,
          onComposerChange: setText,
          composerSlots: mode === 'recalled' ? { drawer: chipDrawer([selected('h1', true)], [PREVIEW_DRAFT]) } : {},
          ...(mode === 'missing' ? { composerStatus: { type: 'warning' as const, message: t('chat.recall.missing', { attachments: 'header-reference.png, h1' }) } } : {}),
        },
      })} />
    </div>
  );
}

const messageActions: Category = {
  id: 'message-actions', title: 'Copy, Retry and recalled prompt chips',
  stories: (['default', 'hover', 'prose', 'long-token', 'clamped', 'chips', 'chips-hover', 'chips-focus', 'chips-scroll', 'focus', 'disabled', 'recalled', 'missing', 'copied', 'code-focus', 'studio'] as const).map((mode) => ({ id: `chat-message-actions-${mode}`, title: mode, render: () => <MessageActionPanel mode={mode} /> })),
};

const scrollIndicator: Category = {
  id: 'scroll-indicator',
  title: 'Scroll to bottom — idle and streaming',
  stories: (['idle', 'streaming', 'streaming-unread', 'unread', 'focus', 'hidden'] as const).map((mode) => ({
    id: `chat-scroll-${mode}`,
    title: mode,
    render: () => (
      <Focused selector={mode === 'focus' ? '.chat-scroll-button button' : undefined}>
        <div style={{ width: REGION.end, padding: 'var(--spacing-6)' }}>
          <ChatScrollButton
            isVisible={mode !== 'hidden'}
            isStreaming={mode !== 'idle' && mode !== 'unread'}
            label={mode === 'unread' || mode === 'streaming-unread' ? STRINGS.newMessages : undefined}
            actionLabel={STRINGS.scrollToBottom}
            onClick={noop}
          />
        </div>
      </Focused>
    ),
  })),
};

/** The sweep's crest, mid-period: a paused animation on a negative delay is one named frame, so two captures match. */
const STILL_PHASE = 0.5;

/* The sweep is declared on the clone's pseudo-element, which a rule on the wrapper cannot reach. */
const STILL_STYLE = `
.chat-gallery-still .inline-morph-content { corner-shape: superellipse(1.5); }
.chat-gallery-still .studio-shimmer-clone::after {
  animation-play-state: paused;
  animation-delay: ${String(-STILL_PHASE * SHIMMER_SWEEP_MS)}ms;
}
#chat-running-changed-target .studio-shimmer-clone::after {
  animation-play-state: running;
  animation-delay: 0ms;
}
.chat-gallery-still .chat-scroll-dot { animation-play-state: paused; animation-delay: -280ms; }
.chat-gallery-still .chat-scroll-dot:nth-child(2) { animation-delay: -140ms; }
.chat-gallery-still .chat-scroll-dot:nth-child(3) { animation-delay: 0ms; }
`;

function StreamingScrollPanel({ turns }: { turns: number }): React.JSX.Element {
  const [lines, setLines] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const history = useMemo<TranscriptItem[]>(() => Array.from({ length: turns }, (_, index) => [
    { kind: 'user' as const, id: `scroll-user-${String(index)}`, text: `Refine section ${String(index + 1)} and keep its spacing consistent.` },
    { kind: 'assistant-text' as const, id: `scroll-reply-${String(index)}`, text: 'Updated the layout and checked the narrow breakpoint.\n\nThe heading and navigation now share the same spacing.', isStreaming: false },
  ]).flat(), [turns]);
  useEffect(() => {
    if (!streaming) return;
    const timer = setInterval(() => setLines((value) => value + 1), 40);
    return () => clearInterval(timer);
  }, [streaming]);
  const items: TranscriptItem[] = [...history,
    { kind: 'user', id: 'scroll-active', text: 'Check the remaining sections.' },
    { kind: 'assistant-text', id: 'scroll-live', text: `Checking the remaining sections.\n\n${'The next section has consistent spacing.\n\n'.repeat(Math.min(lines, 400))}`, isStreaming: streaming },
    { kind: 'user', id: 'scroll-queued', text: 'Then check the footer.', delivery: 'waiting' },
  ];
  return <div data-testid="streaming-scroll-panel">
    <button type="button" data-testid="scroll-toggle-stream" onClick={() => setStreaming((value) => !value)}>{streaming ? 'Pause replay' : 'Resume replay'}</button>
    <LivePanel state={panelState(items, streaming, 'steer')} height={660} />
  </div>;
}

/* Past the open cap, so every prompt clamps to 8 lines and opens to exactly 18: one closing cancels another opening (ONL-2650). */
const EXCHANGE_PROMPT = Array.from({ length: 24 }, (_, line) => `Line ${String(line + 1)} of a prompt long enough to clamp.`).join('\n');

function ClampExchangePanel(): React.JSX.Element {
  const items = Array.from({ length: 8 }, (_, index) => [
    { kind: 'user' as const, id: `exchange-user-${String(index)}`, text: EXCHANGE_PROMPT },
    { kind: 'assistant-text' as const, id: `exchange-reply-${String(index)}`, text: 'Updated the layout and checked the narrow breakpoint.', isStreaming: false },
  ]).flat();
  return <div data-testid="clamp-exchange-panel">
    <LivePanel state={panelState(items, false, 'steer')} height={660} />
  </div>;
}

const clampExchange: Category = {
  id: 'clamp-exchange', title: 'Prompts that trade height', stories: [{
    id: 'clamp-exchange', title: 'Eight clamped prompts, same length',
    note: 'open one prompt and then another: the first closes as the second opens, so the transcript keeps its height while the rows between them move.',
    render: () => <ClampExchangePanel />,
  }],
};

const streamingScroll: Category = {
  id: 'streaming-scroll', title: 'Long transcript replay', stories: [30, 300].map((turns) => ({
    id: `streaming-scroll-${String(turns)}`, title: `${String(turns)} turns, active reply and queued prompt`,
    note: 'scroll it while the reply grows: the pinned prompt holds and the view stays where it was put. Renders on supplied rows, so the session fold is not in the path.',
    render: () => <StreamingScrollPanel turns={turns} />,
  })),
};

export const CHAT_GALLERY: Gallery = {
  id: 'chat',
  title: 'Chat',
  subtitle: 'packages/chat-ui, exhaustive over its exports, on fixture props',
  categories: [TOUCHED_FILES_CATEGORY, TOUCHED_FILE_PREVIEW_CATEGORY, SKILLS_LIST_CATEGORY, SKILLS_EMPTY_CATEGORY, SKILLS_TOKEN_CATEGORY, SKILLS_NOTICE_CATEGORY, SKILLS_SENT_CATEGORY, FILES_SKILLS_CATEGORY, chips, pills, shimmer, toolRows, {
    id: 'artifact-handoff', title: 'Artifact handoff', stories: [{id: 'artifact-handoff', title: 'Artifact-to-code draft', render: () => <PreviewPanel items={[]} composerValue={t('artifact.chat.handoffPrompt')} />}],
  }, {
    id: 'artifact-tool-rows', title: 'Artifact tool rows', stories: (['in_progress', 'completed', 'failed'] as const).map((status) => ({
      id: `artifact-tool-rows-${status}`, title: `Artifact tools ${status}`, render: () => <ToolCalls
        calls={[
          {...tool(`artifact-read-${status}`, 'read', 'mcp__studio__read_artifact', 'read artifact', status), result: 'Untrusted artifact page content'},
          {...tool(`artifact-edit-${status}`, 'edit', 'mcp__studio__set_artifact', 'set artifact', status), result: 'The artifact was updated'},
        ]}
        strings={STRINGS} chevronIcon={ForwardIcon} onRespond={noop}
      />,
    })),
  }, runningClip, nextTasks, welcome, setupRow, setupSteps, noConnection, approval, QUESTION_SHEET_CATEGORY, images, attachmentPreview, delivery, codexErrors, turnTimer, pen, providerNoticeRow, composerRow, inlineBubble, messageActions, streamingScroll, clampExchange, scrollIndicator],
  frame: (children) => (
    <div className="chat-gallery-still">
      <style href="chat-gallery-still" precedence="high">
        {STILL_STYLE}
      </style>
      {children}
    </div>
  ),
};
