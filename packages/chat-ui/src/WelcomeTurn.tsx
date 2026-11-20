/**
 * The reassurance message — what Studio says once it has made a project.
 * Each sentence is one template whose slots become chips, so a translation can
 * put the repo, the project and the branches anywhere in it.
 *
 * Each sentence renders only if the data it NAMES is present: a payload with no
 * branch loses the branch sentence rather than drawing an empty chip, which
 * would be a fabricated value wearing a real one's treatment.
 *
 * The leading is 1.4, the register's per-surface call for prose
 * (`apps/studio/src/theme/REGISTER.md` §7.1). Astryx's computed 1.5385 spreads
 * lines 3.4px while paragraph separation barely moves, collapsing the ratio
 * that makes three paragraphs read as three. Scoped to this surface: a
 * theme-wide override gives up Astryx's 4px-grid snapping everywhere at once.
 *
 * The ink is set once on the container, with `color="inherit"` below: the
 * design's tertiary maps to `--color-text-gray`, and `TextColor` is semantic
 * only, so there is no `color="gray"` to reach for.
 */
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { WelcomeProject } from '@studio/events';

import { Chip, type ChipKind } from './Chip.js';
import { around, sentenceParts } from './fill.js';
import { ShimmerText } from './ShimmerText.js';
import { SHIMMER_CREST } from './tool-rows/ink.js';

/** See the file header — 1.4 is the register's per-surface call for prose. */
const PROSE_LEADING = 1.4;

/**
 * Row gap inside a wrapping sentence: 2px block / 4px inline, both on-ramp.
 * The two differ on purpose — words in a wrapped clause sit closer vertically
 * than they do horizontally, or the clause reads as two paragraphs.
 */
const SENTENCE_GAPS = {
  rowGap: 'var(--spacing-0-5)',
  columnGap: 'var(--spacing-1)',
} as const;

export interface WelcomeTurnStrings {
  /** `{repo}` and `{project}` are chips. */
  copy: string;
  /** `{branch}` and `{base}` are chips. */
  branch: string;
  /** The one line a copied folder adds (ONL-2177): git was set up on the copy, the folder is untouched. */
  copiedNote: string;
}

export interface WelcomeTurnProps {
  strings: WelcomeTurnStrings;
  /**
   * The four names the turn puts in chips. One object rather than four props
   * (ONL-1861): two call sites build this, and spreading it at each is where a
   * fifth field gets added in one place and forgotten in the other.
   */
  workspace: WelcomeProject;
}

/** A line of copy that wraps around its inline chips. */
function Sentence({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <HStack align="center" wrap="wrap" width="100%" style={SENTENCE_GAPS}>
      {children}
    </HStack>
  );
}

interface LineProps {
  children: ReactNode;
  'data-testid'?: string;
}

/**
 * One phrase between chips. `whiteSpace: nowrap` wraps the prose at PHRASE
 * granularity rather than word, so the line breaks between fragments and chips
 * instead of orphaning single words beside them.
 */
function Copy({ children, ...rest }: LineProps): React.JSX.Element {
  return (
    <Text type="body" color="inherit" style={{ whiteSpace: 'nowrap', lineHeight: PROSE_LEADING }} {...rest}>
      {children}
    </Text>
  );
}

/** A whole line of body copy, in the block's ink and leading. */
function Line({ children, ...rest }: LineProps): React.JSX.Element {
  return (
    <Text type="body" color="inherit" style={{ lineHeight: PROSE_LEADING }} {...rest}>
      {children}
    </Text>
  );
}

const WORDS = new Intl.Segmenter(undefined, { granularity: 'word' });

/** A chip and the particle after it, kept on one line: a Japanese line must not begin with a particle. */
const GLUED: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', columnGap: SENTENCE_GAPS.columnGap };

/** The first word of `text` when it is not in Latin script, so an English word after a chip still wraps freely; and the rest. */
function particleAfter(text: string): [string, string] {
  const body = text.trimStart();
  const first = WORDS.segment(body)[Symbol.iterator]().next().value?.segment ?? '';
  if (first === '' || /^[\p{Script=Latin}\p{N}]/u.test(first)) return ['', text];
  return [first, body.slice(first.length)];
}

type Piece = { text: string } | { slot: string; tail: string };

/** `template` cut at its chips, each chip carrying the particle after it. */
function pieces(template: string, slots: readonly string[]): Piece[] {
  const parts: Piece[] = sentenceParts(template, slots).map((part): Piece => ('text' in part ? { text: part.text } : { slot: part.slot, tail: '' }));
  parts.forEach((part, index) => {
    const after = parts[index + 1];
    if ('slot' in part && after !== undefined && 'text' in after) [part.tail, after.text] = particleAfter(after.text);
  });
  return parts;
}

/** Blank-safe: a value that is absent or whitespace cannot name anything. */
function has(value: string): boolean {
  return value.trim() !== '';
}

/**
 * The setup line (ONL-2244) — what Studio says while it is still MAKING the
 * project the welcome turn will later describe.
 *
 * ⚠️ ONE line that REPLACES itself as the phase advances, never a growing log,
 * and it carries no spinner or status colour of its own: the canvas beside it is
 * deliberately, obviously blank, and a second progress surface would compete
 * with this one. Same container, same ink and same leading as the welcome it
 * gives way to, so the handover is a change of words rather than of surface.
 */
export interface SetupFailure {
  nextAction: string;
  retryLabel: string;
  onRetry?: () => void;
  /** Choose the source folder again (ONL-3285) — the way out of a failure Retry cannot clear. */
  chooseLabel?: string;
  onChoose?: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
  /** The machine's own words (git's, the package manager's), behind a disclosure so the guidance leads (ONL-3285). */
  detail?: { text: string; showLabel: string; hideLabel: string };
}

export interface SetupTurnProps {
  /** `{repo}` is where the project's chip sits, so a translation can put it anywhere in the line. */
  line: string;
  repo: string;
  /** The stage the line names, as the machine spells it — a fact for a driver, never rendered. */
  phase?: string;
  /** Present when the stage the line names has FAILED (ONL-2179): the next action and Retry, in place. */
  failure?: SetupFailure;
  /** The line shimmers like a running tool row while the work it names is under way (ONL-2913). */
  isRunning?: boolean;
  chevronIcon?: IconType;
}

function FailureDetail({ detail, chevronIcon }: { detail: NonNullable<SetupFailure['detail']>; chevronIcon?: IconType }): React.JSX.Element {
  const bodyId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const label = isOpen ? detail.hideLabel : detail.showLabel;
  return (
    <VStack align="start" gap={1} width="100%">
      <Button
        label={label}
        variant="ghost"
        size="sm"
        aria-expanded={isOpen}
        {...(isOpen ? { 'aria-controls': bodyId } : {})}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="chat-setup-detail-toggle"
        style={{ paddingInline: 0, color: 'inherit' }}
        endContent={
          chevronIcon === undefined ? undefined : (
            <span aria-hidden="true" style={{ display: 'inline-flex', transform: isOpen ? 'rotate(90deg)' : undefined }}>
              <Icon icon={chevronIcon} size="sm" />
            </span>
          )
        }
      />
      {isOpen ? (
        <Text
          id={bodyId}
          type="supporting"
          color="inherit"
          style={{ lineHeight: PROSE_LEADING, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          data-testid="chat-setup-detail"
        >
          {detail.text}
        </Text>
      ) : null}
    </VStack>
  );
}

function SetupPhrase({ text, isRunning, testId }: { text: string; isRunning: boolean; testId?: string }): ReactNode {
  const phrase = text.trim();
  if (phrase === '') return null;
  if (!isRunning) return <Copy {...(testId === undefined ? {} : { 'data-testid': testId })}>{phrase}</Copy>;
  return (
    <span data-testid={testId} data-running="true" style={{ display: 'flex' }}>
      <ShimmerText isActive weight="normal" base="var(--color-text-gray)" crest={SHIMMER_CREST} style={{ whiteSpace: 'nowrap', lineHeight: PROSE_LEADING }}>
        {phrase}
      </ShimmerText>
    </span>
  );
}

export function SetupTurn({ line, repo, phase, failure, isRunning = false, chevronIcon }: SetupTurnProps): React.JSX.Element {
  const { before, after: rest } = around(line, 'repo');
  const [tail, after] = particleAfter(rest);
  const chip = <Chip kind="project">{repo}</Chip>;
  return (
    <VStack
      align="stretch"
      gap={2}
      width="100%"
      data-testid="chat-setup"
      data-setup-phase={phase}
      data-setup-failed={failure === undefined ? undefined : 'true'}
      style={{ color: 'var(--color-text-gray)' }}
    >
      <Sentence>
        <SetupPhrase text={before} isRunning={isRunning} testId="chat-setup-line" />
        {tail === '' ? chip : (
          <span style={GLUED}>
            {chip}
            <SetupPhrase text={tail} isRunning={isRunning} />
          </span>
        )}
        <SetupPhrase text={after} isRunning={isRunning} {...(before.trim() === '' ? { testId: 'chat-setup-line' } : {})} />
      </Sentence>
      {failure === undefined ? null : (
        <VStack align="start" gap={2} width="100%">
          <Line>{failure.nextAction}</Line>
          <HStack gap={2} align="center">
            {failure.onRetry === undefined ? null : <Button
              label={failure.retryLabel}
              variant="secondary"
              size="sm"
              onClick={failure.onRetry}
              data-testid="chat-setup-retry"
            />}
            {failure.onChoose === undefined || failure.chooseLabel === undefined ? null : (
              <Button
                label={failure.chooseLabel}
                variant="secondary"
                size="sm"
                onClick={failure.onChoose}
                data-testid="chat-setup-choose-folder"
              />
            )}
            {failure.onDismiss === undefined || failure.dismissLabel === undefined ? null : (
              <Button
                label={failure.dismissLabel}
                variant="secondary"
                size="sm"
                onClick={failure.onDismiss}
                data-testid="chat-setup-dismiss"
              />
            )}
          </HStack>
          {failure.detail === undefined ? null : <FailureDetail detail={failure.detail} {...(chevronIcon === undefined ? {} : { chevronIcon })} />}
        </VStack>
      )}
    </VStack>
  );
}

function ChipSentence({ template, chips }: { template: string; chips: Record<string, [ChipKind, string]> }): React.JSX.Element {
  return (
    <Sentence>
      {pieces(template, Object.keys(chips)).map((part, index) => {
        if ('text' in part) {
          const text = part.text.trim();
          return text === '' ? null : <Copy key={index}>{text}</Copy>;
        }
        const [kind, name] = chips[part.slot]!;
        const chip = (
          <Chip key={index} kind={kind}>
            {name}
          </Chip>
        );
        return part.tail === '' ? chip : (
          <span key={index} style={GLUED}>
            {chip}
            {part.tail === '' ? null : <Copy>{part.tail}</Copy>}
          </span>
        );
      })}
    </Sentence>
  );
}

export function WelcomeTurn({ strings, workspace }: WelcomeTurnProps): React.JSX.Element {
  const { sourceRepoName, workspaceName, branchName, baseBranch } = workspace;
  const hasCopy = has(sourceRepoName) && has(workspaceName);
  const hasBranch = has(branchName) && has(baseBranch);

  return (
    /* No padding of its own (ONL-1861) — the container insets this. It renders
       on two surfaces with two correct insets and cannot know which it is in. */
    <VStack
      align="stretch"
      gap={2}
      width="100%"
      data-testid="chat-welcome"
      // The block's one colour, set once. See the file header.
      style={{ color: 'var(--color-text-gray)' }}
    >
      {/* No greeting line — it is wrong on every project
          after the first and pushes the sentences that carry facts down. */}
      {workspace.copied ? <Line data-testid="chat-welcome-copied">{strings.copiedNote}</Line> : null}

      {hasCopy ? (
        <ChipSentence
          template={strings.copy}
          chips={{ repo: ['project', sourceRepoName], project: ['workspace', workspaceName] }}
        />
      ) : null}

      {hasBranch ? (
        <ChipSentence template={strings.branch} chips={{ branch: ['ref', branchName], base: ['ref', baseBranch] }} />
      ) : null}
    </VStack>
  );
}
