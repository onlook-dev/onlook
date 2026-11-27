/** Fixture props, so the still lifes carry the package's stub strings; ProjectCard owns its own, through the catalog (ONL-2174). */

import { useState } from 'react';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import {
  GIT_CARD_STATES,
  GIT_PILL_STATES,
  GitCardStatus,
  GitStatusDropdown,
  GitStatusPill,
  isActionable,
  noAccessLineFor,
  type GitDropdownOption,
  type GitPillGlyphs,
  type GitPillState,
  type GitPillStateId,
} from '@studio/git-ui';
import { PILL_FIXTURES as STATES, STUB_STRINGS as STRINGS } from '@studio/git-ui/fixtures';
import { ACCOUNT_MEASUREMENTS, row } from '@studio/git-ui/measurement-fixtures';
import { cardStateFor, derivePillState } from '@studio/git-ui/derive';
import { GIT_PILL_GLYPHS as GLYPHS, GIT_PR_FAILURE_STRINGS, cardGlyphFor, leadingFor } from '../../git-status/presentation.js';
import { PROJECT_CARD_WIDTH, ProjectCard, type ProjectCardProps } from '../../projects/ProjectCard.js';
import { Focused, noop, type Category, type Gallery } from './Showroom.js';
import { t } from '@studio/i18n';

const TOOLTIP = ['feat/pricing-v2', '2 ahead, 4 behind', 'as of 3:41 PM'];

/** A No Access pill has no button, so the window-bar gallery's hover and focus queries cannot open its tooltip; these stories force it open. */
const NO_ACCESS_FIXTURES = Object.entries(ACCOUNT_MEASUREMENTS).filter(([name]) => name.startsWith('no-access'));

function LivePill({ initial, glyphs, testId }: { initial: GitPillState; glyphs: GitPillGlyphs; testId: string }) {
  const [state, setState] = useState(initial);
  const onPick = (option: GitDropdownOption) => {
    if (option === 'open-in-browser' || option === 'merge') {
      setState((s) => (s.id === 'ready-to-merge' ? { ...s, dropdownDefault: option } : s));
    } else {
      setState(STATES[option]);
    }
  };
  return <GitStatusPill state={state} strings={STRINGS} glyphs={glyphs} onAction={noop} onOpenPr={noop} onPick={onPick} testId={testId} />;
}

function pillStory(id: GitPillStateId) {
  const state = STATES[id];
  const leading = leadingFor(id);
  const glyphs = leading ? { ...GLYPHS, leading } : GLYPHS;
  return {
    id: `git-gallery-pill-${id}`,
    title: id,
    note: isActionable(id) ? 'rest · working · stale · queued' : id === 'first-paint' ? 'rest' : 'rest · stale',
    render: () => (
      <>
        <LivePill initial={state} glyphs={glyphs} testId={`git-status-pill-${id}`} />
        {isActionable(id) && (
          <GitStatusPill state={{ ...state, mode: 'working' } as GitPillState} strings={STRINGS} glyphs={glyphs} onAction={noop} onOpenPr={noop} testId={`git-status-pill-${id}-working`} />
        )}
        {id !== 'first-paint' && (
          <GitStatusPill state={{ ...state, mode: 'stale' } as GitPillState} strings={STRINGS} glyphs={glyphs} onAction={noop} onOpenPr={noop} testId={`git-status-pill-${id}-stale`} />
        )}
        {isActionable(id) && (
          /* Room on both sides: the layer flips above when below is tight. */
          <div style={{ paddingBlock: 56 }}>
            <GitStatusPill state={state} strings={STRINGS} glyphs={glyphs} tooltip={TOOLTIP} isTooltipOpen isQueued onAction={noop} onOpenPr={noop} testId={`git-status-pill-${id}-queued`} />
          </div>
        )}
      </>
    ),
  };
}

const CATEGORIES: Category[] = [
  {
    id: 'no-history', title: 'Without Git history', stories: [
      ...(['default', 'hover', 'focus'] as const).map((state) => ({
        id: `no-history-${state}`, title: state,
        render: () => (
          <Focused selector={state === 'default' ? undefined : '[data-testid="no-history-pill"] [tabindex="0"]'} hover={state === 'hover'}>
            <div style={{ paddingBlock: 64 }}>
              <GitStatusPill state={STATES['no-git']} strings={STRINGS} glyphs={GLYPHS}
                tooltip={[t('gitStatus.tooltip.no-git')]} isTooltipOpen={state === 'hover' ? true : undefined} testId="no-history-pill" />
            </div>
          </Focused>
        ),
      })),
      ...(['default', 'hover', 'focus'] as const).map((state) => ({
        id: `no-history-card-${state}`, title: `Project card ${state}`,
        render: () => (
          <Focused selector={state === 'default' ? undefined : '[data-testid="project-card-open"]'} hover={state === 'hover'}>
            <div style={PROJECT_CARD_FRAME}><ProjectCard name="New design" meta="4h" gitState="no-git" /></div>
          </Focused>
        ),
      })),
    ],
  },
  {
    id: 'failures',
    title: 'Create PR — recovery',
    stories: Object.entries(GIT_PR_FAILURE_STRINGS).map(([id, failure]) => ({
      id: `git-gallery-failure-${id}`,
      title: failure.label,
      note: failure.nextStep,
      render: () => (
        <div style={{ paddingBlock: 56 }}>
          <GitStatusPill state={STATES['create-pr']} failure={failure} strings={STRINGS} glyphs={GLYPHS} isTooltipOpen onAction={noop} onPick={noop} testId={`git-failure-${id}`} />
        </div>
      ),
    })),
  },
  {
    id: 'pill',
    title: 'The pill — cascade order',
    stories: GIT_PILL_STATES.map(pillStory),
  },
  {
    id: 'dropdown',
    title: 'The dropdown — default first, checked',
    stories: [
      {
        id: 'git-gallery-dropdown-no-pr',
        title: 'S0/S1',
        note: 'Create PR default · Push default',
        render: () => (
          <>
            <GitStatusDropdown id="create-pr" current="create-pr" strings={STRINGS} check={GLYPHS.check} onPick={noop} menuLabel={STRINGS.openMenuAria} />
            <GitStatusDropdown id="push" current="push" strings={STRINGS} check={GLYPHS.check} onPick={noop} menuLabel={STRINGS.openMenuAria} />
          </>
        ),
      },
      {
        id: 'git-gallery-dropdown-fix-checks',
        title: 'S4 with local changes',
        note: 'Upload Changes stays reachable while checks fail',
        render: () => (
          <>
            <LivePill initial={{ ...STATES['fix-checks'], dirty: true } as GitPillState} glyphs={GLYPHS} testId="git-status-pill-fix-checks-dirty" />
            <GitStatusDropdown id="fix-checks" strings={STRINGS} check={GLYPHS.check} onPick={noop} menuLabel={STRINGS.openMenuAria} />
          </>
        ),
      },
      {
        id: 'git-gallery-dropdown-ready',
        title: 'S7',
        note: 'Open in browser default · Merge default',
        render: () => (
          <>
            <GitStatusDropdown id="ready-to-merge" current="open-in-browser" strings={STRINGS} check={GLYPHS.check} onPick={noop} menuLabel={STRINGS.openMenuAria} />
            <GitStatusDropdown id="ready-to-merge" current="merge" strings={STRINGS} check={GLYPHS.check} onPick={noop} menuLabel={STRINGS.openMenuAria} />
          </>
        ),
      },
    ],
  },
  {
    id: 'tooltip',
    title: 'The hover line',
    stories: [
      {
        id: 'git-gallery-tooltip',
        title: 'branch · ahead/behind · as of',
        render: () => (
          <div style={{ paddingBlock: 56 }}>
            <GitStatusPill state={STATES['download-changes']} strings={STRINGS} glyphs={GLYPHS} tooltip={TOOLTIP} isTooltipOpen onAction={noop} onOpenPr={noop} testId="git-status-pill-tooltip" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'no-access',
    title: 'No Access — the line that says what to do',
    stories: NO_ACCESS_FIXTURES.map(([name, measured]) => {
      const state = derivePillState(row(measured), GIT_PILL_SHIPPED_DEFAULTS);
      return {
        id: `git-gallery-${name}`,
        title: name,
        note: noAccessLineFor(state, STRINGS) ?? name,
        render: () => (
          <div style={{ paddingBlock: 56 }}>
            <GitStatusPill state={state} strings={STRINGS} glyphs={GLYPHS} isTooltipOpen onAction={noop} onOpenPr={noop} testId={`git-status-pill-${name}`} />
          </div>
        ),
      };
    }),
  },
  {
    id: 'card',
    title: 'The card — pill at card scale, and the nine states',
    stories: [
      {
        id: 'git-gallery-card-pill',
        title: 'Card-scale pill',
        note: 'PR number only',
        render: () => (
          <>
            <GitStatusPill state={STATES['ready-to-merge']} strings={STRINGS} glyphs={GLYPHS} scale="card" testId="git-status-pill-card" />
            <GitStatusPill state={STATES.merged} strings={STRINGS} glyphs={GLYPHS} scale="card" testId="git-status-pill-card-merged" />
          </>
        ),
      },
      ...GIT_CARD_STATES.map((id) => ({
        id: `git-gallery-card-${id}`,
        title: id,
        render: () => <GitCardStatus age="4h" state={id} strings={STRINGS} glyph={cardGlyphFor(id)} testId={`git-card-status-${id}`} />,
      })),
    ],
  },
  {
    id: 'project-card',
    title: 'The composed project card — status row and floating pill',
    stories: [
      projectCardStory('rest', 'age alone, clean thumbnail', {}),
      projectCardStory('checks-failed', 'attention glyph + PR pill', { gitState: cardStateFor(STATES['fix-checks']), gitPill: STATES['fix-checks'] }),
      projectCardStory('conflicts', undefined, { gitState: cardStateFor(STATES['resolve-conflicts']), gitPill: STATES['resolve-conflicts'] }),
      projectCardStory('checks-running', undefined, { gitState: cardStateFor(STATES['checks-running']), gitPill: STATES['checks-running'] }),
      projectCardStory('updates-available', undefined, { gitState: cardStateFor(STATES['download-changes']), gitPill: STATES['download-changes'] }),
      projectCardStory('not-uploaded-pre-pr', 'status only, no pill — settled decision 2', { gitState: 'not-uploaded' }),
      projectCardStory('not-uploaded', 'inside an open PR', { gitState: cardStateFor(STATES['upload-changes']), gitPill: STATES['upload-changes'] }),
      projectCardStory('ready-to-merge', undefined, { gitState: cardStateFor(STATES['ready-to-merge']), gitPill: STATES['ready-to-merge'] }),
      projectCardStory('merged', undefined, { gitState: cardStateFor(STATES.merged), gitPill: STATES.merged }),
      projectCardStory('local-only', undefined, { gitState: 'local-only' }),
      projectCardStory('pill-only', 'a PR with nothing to say — independence corner', { gitPill: STATES['draft-pr'] }),
      projectCardStory('archived', 'receded ink, no git signal', { isArchived: true }),
    ],
  },
];

const PROJECT_CARD_FRAME = { width: PROJECT_CARD_WIDTH } as const;

function projectCardStory(id: string, note: string | undefined, props: Partial<ProjectCardProps>) {
  return {
    id: `git-gallery-project-card-${id}`,
    title: id,
    ...(note === undefined ? {} : { note }),
    render: () => (
      <div style={PROJECT_CARD_FRAME}>
        <ProjectCard name="pricing-v2" meta="acme · 4h" {...props} />
      </div>
    ),
  };
}

export const GIT_GALLERY: Gallery = {
  id: 'git',
  title: 'Git status',
  subtitle: 'ONL-2172 · pill and card, on fixture props',
  categories: CATEGORIES,
  /* Working states shimmer; the still life freezes them so a frame is a frame. */
  frame: (children) => (
    <div className="git-gallery-frozen">
      <style href="git-gallery-frozen" precedence="high">{`.git-gallery-frozen [data-tool-shimmer] { animation: none; }`}</style>
      {children}
    </div>
  ),
};
