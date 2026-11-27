import type { ComponentType } from 'react';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import type { CentralIconBaseProps } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/CentralIconBase';
import type { GitCardStateId, GitPillGlyphs, GitPillStateId, GitStatusStrings } from '@studio/git-ui';
import {
  BranchIcon,
  CheckIcon,
  ChevronDownIcon,
  CloudDownloadIcon,
  CloudUploadIcon,
  GithubIcon,
  GlyphCircleInfo,
  GlyphCross,
  GlyphLoadingCircle,
  MergedIcon,
  OpenExternalIcon,
} from '../icons/glyphs.js';
import { t } from '@studio/i18n';

export const GIT_PR_FAILURE_STRINGS = {
  'no-changes': { label: t('gitStatus.failure.no-changes'), nextStep: t('gitStatus.failure.no-changes.nextStep') },
  'push-refused': { label: t('gitStatus.failure.push-refused'), nextStep: t('gitStatus.failure.push-refused.nextStep') },
  'org-approval': { label: t('gitStatus.failure.org-approval'), nextStep: t('gitStatus.failure.org-approval.nextStep') },
  'sign-in': { label: t('gitStatus.failure.sign-in'), nextStep: t('gitStatus.failure.sign-in.nextStep') },
  unknown: { label: t('gitStatus.failure.unknown'), nextStep: t('gitStatus.failure.unknown.nextStep') },
};

export const GIT_STATUS_STRINGS: GitStatusStrings = {
  pillLabel: {
    'no-git': t('gitStatus.label.no-git'),
    'no-access': t('gitStatus.label.no-access'),
    'connect-github': t('gitStatus.label.connect-github'),
    'local-only': t('gitStatus.label.local-only'),
    merged: t('gitStatus.label.merged'),
    'pr-closed': t('gitStatus.label.pr-closed'),
    'draft-pr': t('gitStatus.label.draft-pr'),
    'resolve-conflicts': t('gitStatus.label.resolve-conflicts'),
    'fix-checks': t('gitStatus.label.fix-checks'),
    'download-changes': t('gitStatus.label.download-changes'),
    'upload-changes': t('gitStatus.label.upload-changes'),
    'checks-running': t('gitStatus.label.checks-running'),
    'ready-to-merge': t('gitStatus.label.ready-to-merge'),
    'create-pr': t('gitStatus.label.create-pr'),
    push: t('gitStatus.label.push'),
  },
  workingLabel: {
    'connect-github': t('gitStatus.working.connect-github'),
    'resolve-conflicts': t('gitStatus.working.resolve-conflicts'),
    'fix-checks': t('gitStatus.working.fix-checks'),
    'download-changes': t('gitStatus.working.download-changes'),
    'upload-changes': t('gitStatus.working.upload-changes'),
    'ready-to-merge': t('gitStatus.working.ready-to-merge'),
    'create-pr': t('gitStatus.working.create-pr'),
    push: t('gitStatus.working.push'),
  },
  cardLabel: {
    'no-git': t('gitStatus.card.no-git'),
    'checks-failed': t('gitStatus.card.checks-failed'),
    conflicts: t('gitStatus.card.conflicts'),
    'checks-running': t('gitStatus.card.checks-running'),
    'updates-available': t('gitStatus.card.updates-available'),
    'not-uploaded': t('gitStatus.card.not-uploaded'),
    'ready-to-merge': t('gitStatus.card.ready-to-merge'),
    merged: t('gitStatus.card.merged'),
    'local-only': t('gitStatus.card.local-only'),
  },
  hoverLabel: {
    merge: t('gitStatus.hover.merge'),
    'open-in-browser': t('gitStatus.hover.open-in-browser'),
  },
  queuedLabel: t('gitStatus.queued.label'),
  queuedTakeBack: t('gitStatus.queued.takeBack'),
  queuedHint: t('gitStatus.queued.hint'),
  option: {
    'create-pr': t('gitStatus.option.create-pr'),
    push: t('gitStatus.option.push'),
    'open-in-browser': t('gitStatus.option.open-in-browser'),
    merge: t('gitStatus.option.merge'),
    'upload-changes': t('gitStatus.option.upload-changes'),
  },
  dropdownHeading: t('gitStatus.dropdownHeading'),
  noAccessLine: t('gitStatus.noAccessLine'),
  openPrAria: t('gitStatus.openPrAria'),
  openMenuAria: t('gitStatus.openMenuAria'),
  separator: t('gitStatus.separator'),
};

const glyph = (icon: IconType): React.ReactNode => <Icon icon={icon} size="sm" color="inherit" />;
/** `size`, never `width`/`height` — the family ignores those and draws 24. */
const spinnerAt = (size: number): React.ReactNode => (
  <span style={{ display: 'flex', animation: 'frame-reload-turn 900ms linear infinite' }}>
    <GlyphLoadingCircle size={size} />
  </span>
);
const spinner = spinnerAt(16);
const cardSpinner = spinnerAt(14);

/** `mode="raw"` is required: the default `masked` hardcodes one maskId per module, so hiding one instance hides the rest. */
const cardGlyph = (Base: ComponentType<CentralIconBaseProps>): React.ReactNode => (
  <Base size={14} mode="raw" />
);

export const GIT_PILL_GLYPHS: GitPillGlyphs = {
  branch: glyph(BranchIcon),
  chevron: glyph(ChevronDownIcon),
  check: glyph(CheckIcon),
  working: spinner,
  openPr: glyph(OpenExternalIcon),
};

export function leadingFor(id: GitPillStateId): React.ReactNode {
  if (id === 'create-pr' || id === 'push') return glyph(GithubIcon);
  if (id === 'upload-changes') return glyph(CloudUploadIcon);
  if (id === 'download-changes') return glyph(CloudDownloadIcon);
  if (id === 'merged') return glyph(MergedIcon);
  if (id === 'checks-running') return spinner;
  return undefined;
}

export function cardGlyphFor(id: GitCardStateId): React.ReactNode {
  if (id === 'checks-failed') return cardGlyph(GlyphCross);
  if (id === 'conflicts') return cardGlyph(GlyphCircleInfo);
  if (id === 'checks-running') return cardSpinner;
  return undefined;
}
