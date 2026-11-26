import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { usePopover } from '@astryxdesign/core/Popover';
import { useListFocus } from '@astryxdesign/core/hooks';
import { CharMorphText, MorphGlyph, ShimmerText } from '@studio/chat-ui';
import { GitStatusDropdown, type GitDropdownOption } from './GitStatusDropdown.js';
import { familyPalette, PILL_FAMILY, PRIMARY } from './palette.js';
import { GlyphSlot } from '@studio/chat-ui';
import { INERT_BUTTON, PillText } from './primitives.js';
import { dropdownFor, isActionable, prOf, type GitPillDropdownId, type GitPillState, type GitPullRequest } from './state.js';
import { fill, type GitStatusStrings } from './strings.js';

export type GitPillScale = 'chrome' | 'card' | 'preview';

export interface GitPillGlyphs {
  branch: ReactNode;
  chevron: ReactNode;
  check: ReactNode;
  leading?: ReactNode;
  working?: ReactNode;
  /** Replaces `branch` while the PR cell is hovered: the press opens the PR in the browser. */
  openPr?: ReactNode;
}

export interface GitStatusPillProps {
  state: GitPillState;
  strings: GitStatusStrings;
  glyphs: GitPillGlyphs;
  scale?: GitPillScale;
  tooltip?: readonly string[];
  failure?: { label: string; nextStep: string };
  isTooltipOpen?: boolean;
  onTooltipOpenChange?: (isOpen: boolean) => void;
  /** Awaited before the menu is placed, so a host too short for it can make room first (ONL-2206). */
  onMenuOpenChange?: (isOpen: boolean) => void | Promise<void>;
  onAction?: () => void;
  onNoActionPress?: () => void;
  /** An action of this pill's own is waiting in main's pen; the press takes it back (ONL-2379). */
  isQueued?: boolean;
  onOpenPr?: (url: string) => void;
  onPick?: (option: GitDropdownOption) => void;
  className?: string;
  testId?: string;
  style?: CSSProperties;
}

interface Look {
  ink: string;
  border: string;
  fill: string;
  ring?: string;
}

/** Element `opacity` measures 2.5:1 on the card ground, so the dim is alpha on the colour (register §18). */
const STALE_ALPHA = '50%';
function dim(color: string): string {
  return `color-mix(in srgb, ${color} ${STALE_ALPHA}, transparent)`;
}

/** The library's prefers-contrast rule reads `--color-skeleton`, so the ink re-points the var rather than setting a background. */
const SKELETON_INK = {
  '--color-skeleton': 'var(--studio-git-neutral-hue)',
  // The library's 0.4s reads as a blink.
  animationDuration: '0.8s',
} as CSSProperties;

const CELL_HOVER_HREF = 'studio-git-cell-hover';
const CELL_CLASS = 'studio-git-cell';

/** The open width is measured (`useRevealWidth`): neither `auto` nor a `0fr → 1fr` track animates, since a grid in a flex row sizes by its content. */
const REVEAL_CLASS = 'studio-git-reveal';

/** The palette crosses over the same window the label takes to move. */
const LOOK_EASE = '260ms cubic-bezier(0.24, 1, 0.4, 1)';
const CHEVRON_CLASS = 'studio-git-chevron';
const CELL_HOVER_RULES = `
.${CELL_CLASS} {
  background: transparent;
  color: inherit;
  transition: padding-inline-end var(--studio-git-reveal-ease), color var(--duration-fast, 125ms) ease-out;
}
.${CELL_CLASS}:hover {
  background: var(--studio-git-cell-hover);
}
/* Grey only: the coloured families set no ink, so this inherits — a no-op. */
.${CELL_CLASS}[data-interactive='true']:hover {
  color: var(--studio-git-cell-hover-ink, inherit);
}
.${CELL_CLASS}[aria-disabled='true']:hover {
  background: transparent;
}
.${REVEAL_CLASS} {
  --studio-git-reveal-ease: var(--duration-medium-min, 225ms) cubic-bezier(0.24, 1, 0.4, 1);
  --studio-git-reveal-shift: 10px;
  display: inline-flex;
  align-self: stretch;
  flex: 0 0 auto;
  overflow: hidden;
  transition: width var(--studio-git-reveal-ease);
}
.${REVEAL_CLASS} > span {
  display: inline-flex;
  align-items: center;
  /* ⚠️ Its own width, not the reveal's: clipped, it must still lay out full size. */
  width: max-content;
  transform: translateX(var(--studio-git-reveal-shift));
  opacity: 0;
  transition: transform var(--studio-git-reveal-ease), opacity var(--studio-git-reveal-ease);
}
.${REVEAL_CLASS}[data-open='true'] > span {
  transform: none;
  opacity: 1;
}
.${CHEVRON_CLASS} {
  display: inline-flex;
  transition: rotate var(--duration-fast, 125ms) cubic-bezier(0.24, 1, 0.4, 1);
}
.${CHEVRON_CLASS}[data-open='true'] {
  rotate: 180deg;
}
@media (prefers-reduced-motion: reduce) {
  .${CELL_CLASS},
  .${REVEAL_CLASS},
  .${REVEAL_CLASS} > span,
  .${CHEVRON_CLASS} {
    transition: none;
  }
}
`;

/** `undefined` strips `INERT_BUTTON`'s inline background AND colour, which beat the hover rules at any specificity. */
const cellStyle = (interactive: boolean, start: string, end: string): CSSProperties => ({
  ...INERT_BUTTON,
  background: undefined,
  color: undefined,
  height: '100%',
  paddingInlineStart: start,
  paddingInlineEnd: end,
  display: 'inline-flex',
  alignItems: 'center',
  ...(interactive ? { cursor: 'pointer' } : {}),
});

function cellHoverOf(state: GitPillState, look: Look): string {
  const source = PILL_FAMILY[state.id] === 'primary' ? look.ink : look.border;
  const strength = PILL_FAMILY[state.id] === 'primary' ? '8%' : '14%';
  return `color-mix(in srgb, ${source} ${strength}, transparent)`;
}

/** Grey reads as nothing under a 14% wash, so its acting cells lift their ink. */
function cellHoverInkOf(state: GitPillState): string | undefined {
  const family = PILL_FAMILY[state.id];
  return family === 'neutral' || family === 'outline' ? 'var(--color-text-primary)' : undefined;
}

function restLook(state: GitPillState): Look {
  const family = PILL_FAMILY[state.id];
  if (family === 'primary') return { ink: PRIMARY.ink, border: PRIMARY.border, fill: PRIMARY.fill, ring: PRIMARY.fill };
  const { hue, tint } = familyPalette(family === 'outline' ? 'neutral' : family);
  return { ink: hue, border: hue, fill: family === 'outline' ? 'transparent' : tint };
}

function lookOf(state: GitPillState, isQueued = false): Look {
  const { hue: neutral, tint } = familyPalette('neutral');
  /* Working and queued keep a fill like their neighbours; only stale drops it, on purpose. */
  if (state.mode === 'working' || isQueued) return { ink: 'var(--color-text-primary)', border: neutral, fill: tint };
  const rest = restLook(state);
  if (state.mode !== 'stale') return rest;
  const hue = PILL_FAMILY[state.id] === 'primary' ? neutral : rest.ink;
  return { ink: dim(hue), border: dim(hue), fill: 'transparent' };
}

function showsPrSegment(state: GitPillState): boolean {
  return prOf(state) !== undefined;
}

export function menuFor(state: GitPillState, scale: GitPillScale): GitPillDropdownId | undefined {
  return scale === 'chrome' && state.mode !== 'working' ? dropdownFor(state) : undefined;
}

// A queued cell explains itself where the pointer is; the branch line stays the branch line.
export function hoverLinesFor(
  state: GitPillState,
  tooltip: readonly string[] | undefined,
  hint: string | undefined,
): { label: readonly string[] | undefined; pr: readonly string[] | undefined } {
  const hasPr = showsPrSegment(state);
  const label = hint !== undefined ? [hint, ...(hasPr ? [] : tooltip ?? [])] : hasPr ? undefined : tooltip;
  return { label, pr: hasPr ? tooltip : undefined };
}

/** `isPressable` gates the hover word, since an unpressable body's press does nothing; exported because static markup cannot reach hover. */
export function labelFor(
  state: GitPillState,
  strings: GitStatusStrings,
  isHovered: boolean,
  isPressable: boolean,
  isQueued = false,
): string | undefined {
  if (state.id === 'first-paint') return undefined;
  if (state.mode === 'working' && isActionable(state.id)) return strings.workingLabel[state.workingAs ?? state.id];
  if (isQueued) return isHovered && isPressable ? strings.queuedTakeBack : strings.queuedLabel;
  /* Ready to Merge is the one status-shaped actionable label, so the pointer turns it into its verb. */
  if (isHovered && isPressable && state.id === 'ready-to-merge') return strings.hoverLabel[state.dropdownDefault];
  return strings.pillLabel[state.id];
}

export function currentOptionOf(state: GitPillState): GitDropdownOption | undefined {
  if (state.id === 'ready-to-merge') return state.dropdownDefault;
  if (state.id === 'create-pr' || state.id === 'push') return state.id;
  return undefined;
}

export function bodyAction(state: GitPillState, onAction?: () => void, onOpenPr?: (url: string) => void): (() => void) | undefined {
  if (state.mode === 'working') return undefined;
  const pr = prOf(state);
  if ((state.id === 'merged' || state.id === 'pr-closed' || state.id === 'draft-pr') && pr && onOpenPr) {
    return () => onOpenPr(pr.url);
  }
  if (isActionable(state.id) && onAction) return onAction;
  return undefined;
}

const POPOVER_OPTIONS = {
  role: 'none',
  hasCloseButton: false,
  hasAutoFocus: false,
  hasLightDismiss: true,
  hasEscapeDismiss: true,
} as const;

/** The cell's host type never changes: a changed type unmounts the subtree and loses the label's morph; the press is an overlay. */
export function bodyPropsFor(label: string | undefined, { isWorking }: { isWorking: boolean }) {
  if (isWorking) return { 'aria-disabled': 'true' as const, 'aria-busy': 'true' as const };
  if (label === undefined) return { 'aria-busy': 'true' as const };
  return {};
}

const SQUIRCLE = { cornerShape: 'superellipse(1.5)' } as const;

const TABULAR_NUMS = { fontVariantNumeric: 'tabular-nums' } as const;

function useRevealWidth(): [React.RefCallback<HTMLSpanElement>, number | undefined] {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const ref = useCallback((node: HTMLSpanElement | null): (() => void) | undefined => {
    // The inner, not the reveal: the reveal's width is the transition's current frame.
    const inner = node?.firstElementChild;
    if (!(inner instanceof HTMLElement)) return undefined;
    // Ceil: the reveal clips, so a rounded-down subpixel takes the last glyph's edge.
    const measure = (): void => setWidth(Math.ceil(inner.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    /* The cleanup is the next line: React 19 calls a ref callback's returned
       function when the node detaches. The rule only recognises `useEffect`. */
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Always mounted: mounted open it has no closed frame to animate from, and a departing one must outlive its state. */
function Reveal({
  isOpen,
  testId,
  children,
}: {
  isOpen: boolean;
  testId: string;
  children: ReactNode;
}): React.JSX.Element {
  const [revealRef, width] = useRevealWidth();
  return (
    <span
      ref={revealRef}
      className={REVEAL_CLASS}
      data-open={isOpen ? 'true' : 'false'}
      data-testid={testId}
      {...(isOpen ? {} : { 'aria-hidden': 'true' as const })}
      style={{ width: isOpen ? width : 0 }}
    >
      <span>{children}</span>
    </span>
  );
}

/** The split button's second control: its own focusable button, so the keyboard reaches the dropdown without the body. */
function DropdownControl({
  id,
  current,
  strings,
  glyphs,
  onPick,
  onOpenChange,
  isReachable = true,
}: {
  id: GitPillDropdownId;
  current?: GitDropdownOption;
  strings: GitStatusStrings;
  glyphs: GitPillGlyphs;
  onPick?: (option: GitDropdownOption) => void;
  onOpenChange?: (isOpen: boolean) => void | Promise<void>;
  /** False while its reveal is closed — it is on its way out and must not be tabbed to. */
  isReachable?: boolean;
}): React.JSX.Element {
  const chevronRef = useRef<HTMLButtonElement | null>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const openingRef = useRef(false);
  /* Light dismiss and Escape never reach `closeMenu`, so this is the only close notification. */
  const handleHide = useCallback(() => {
    void onOpenChange?.(false);
  }, [onOpenChange]);
  const menu = usePopover({ ...POPOVER_OPTIONS, onHide: handleHide });
  const { listRef, handleKeyDown, focusFirst } = useListFocus<HTMLDivElement>({
    itemSelector: '[role="menuitemradio"], [role="menuitem"]',
    onEscape: () => closeMenu(),
  });
  function cancelFocusFrame(): void {
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = undefined;
  }
  useEffect(() => cancelFocusFrame, []);
  const openMenu = async (): Promise<void> => {
    cancelFocusFrame();
    openingRef.current = true;
    try {
      await onOpenChange?.(true);
    } finally {
      openingRef.current = false;
    }
    menu.show();
    frameRef.current = requestAnimationFrame(() => focusFirst());
  };
  function closeMenu(): void {
    cancelFocusFrame();
    menu.hide();
    chevronRef.current?.focus();
  }

  return (
    <>
      <button
        type="button"
        ref={(el: HTMLButtonElement | null) => {
          chevronRef.current = el;
          menu.triggerRef(el);
        }}
        className={CELL_CLASS}
        data-interactive="true"
        aria-label={strings.openMenuAria}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        data-testid="git-status-chevron"
        {...(isReachable ? {} : { tabIndex: -1 })}
        onClick={() => {
          if (openingRef.current) return;
          if (menu.isOpen) closeMenu();
          else void openMenu();
        }}
        onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
          if (!menu.isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            void openMenu();
          }
        }}
        style={{ ...INERT_BUTTON, background: undefined, color: undefined, cursor: 'pointer', height: '100%', paddingInline: 'var(--spacing-1-5)', display: 'inline-flex', alignItems: 'center' }}
      >
        {/* 16, not the 14 elsewhere: a 14 slot let the chevron hang past its own end. */}
        <GlyphSlot size={16}>
          {/* `rotate`, not `transform`: the class owns the turn, so reduced motion reaches it. */}
          <span className={CHEVRON_CLASS} data-open={menu.isOpen ? 'true' : 'false'}>
            {glyphs.chevron}
          </span>
        </GlyphSlot>
      </button>
      {menu.render(
        <GitStatusDropdown
          id={id}
          current={current}
          strings={strings}
          check={glyphs.check}
          menuLabel={strings.openMenuAria}
          listRef={listRef}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              const focused = document.activeElement;
              if (focused instanceof HTMLElement && focused.getAttribute('role')?.startsWith('menuitem')) focused.click();
              return;
            }
            handleKeyDown(event);
          }}
          onPick={(option) => {
            closeMenu();
            onPick?.(option);
          }}
        />,
        { placement: 'below', alignment: 'end' },
      )}
    </>
  );
}

export function GitStatusPill({
  state,
  strings,
  glyphs,
  scale = 'chrome',
  tooltip,
  failure,
  isTooltipOpen,
  onTooltipOpenChange,
  onMenuOpenChange,
  onAction,
  onNoActionPress,
  isQueued = false,
  onOpenPr,
  onPick,
  className,
  testId,
  style,
}: GitStatusPillProps): React.JSX.Element | null {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrHovered, setIsPrHovered] = useState(false);
  const [isBodyHovered, setIsBodyHovered] = useState(false);
  const handleMenuOpenChange = useCallback(
    async (open: boolean): Promise<void> => {
      // Set first, awaited second: the tooltip stays suppressed while the host makes room.
      setIsMenuOpen(open);
      await onMenuOpenChange?.(open);
    },
    [onMenuOpenChange],
  );
  /** The departing PR, kept so the reveal has something to slide out. */
  const lastPrRef = useRef<GitPullRequest | undefined>(undefined);
  /** Likewise the departing menu. */
  const lastDropdownRef = useRef<GitPillDropdownId | undefined>(undefined);
  const isChrome = scale === 'chrome';
  const isWorking = state.mode === 'working';
  /* Chrome-only, like the menu: the card pill carries no queue of its own. */
  const showsQueued = isQueued && isChrome && !isWorking;
  const look = lookOf(state, showsQueued);
  const pr = prOf(state);
  const dropdown = menuFor(state, scale);
  /* Remembered in effects, not render: a ref written during render is overwritten by whichever commit lands last. */
  useEffect(() => {
    if (pr) lastPrRef.current = pr;
  }, [pr]);
  useEffect(() => {
    if (dropdown !== undefined) lastDropdownRef.current = dropdown;
  }, [dropdown]);
  // The card pill exists only with a PR; the card's status word carries the rest (ONL-2172).
  if (scale === 'card' && !pr) return null;
  /* Queued takes the body whatever the state derives: the word says Take Back, so the press must take back. */
  const action = !isChrome ? undefined : showsQueued ? onAction : bodyAction(state, onAction, onOpenPr);
  const shownFailure = !isWorking && !showsQueued && (state.id === 'create-pr' || state.id === 'push') ? failure : undefined;
  const label = shownFailure?.label ?? labelFor(state, strings, isBodyHovered, action !== undefined, showsQueued);
  const revealDropdown = isChrome ? dropdown ?? lastDropdownRef.current : undefined;
  const current = currentOptionOf(state);
  const hasPrSegment = showsPrSegment(state);

  const height = isChrome ? 'var(--studio-git-pill-height)' : 'var(--studio-attachment-pill-height)';
  const fontSize = isChrome ? 'var(--text-supporting-size)' : 'var(--studio-git-card-label-size)';
  /* The two dividers are unlike on purpose: a full seam before the branch, a short faded dash before the chevron. */
  const divider = (
    <span
      aria-hidden="true"
      style={{ alignSelf: 'stretch', width: '0.5px', background: look.border, transition: `background-color ${LOOK_EASE}` }}
    />
  );
  const menuDivider = (
    <span
      aria-hidden="true"
      style={{
        alignSelf: 'center',
        width: '0.5px',
        height: '55%',
        background: look.border,
        opacity: 0.6,
        transition: `background-color ${LOOK_EASE}`,
      }}
    />
  );

  const shimmers = isWorking || state.id === 'checks-running';

  const labelNode =
    label === undefined ? (
      <Skeleton
        width="var(--studio-git-skeleton-width)"
        height="var(--text-supporting-size)"
        radius={1}
        data-testid="git-status-skeleton"
        style={SKELETON_INK}
      />
    ) : (
      /* ⚠️ ONE TREE, shimmering or not: a branch here unmounts the morph
         mid-move, and the click a user makes crosses the shimmer boundary. */
      <ShimmerText
        isActive={shimmers}
        hasStableLayers
        type="body"
        weight="medium"
        hasGlow={false}
        base="var(--studio-git-neutral-hue)"
        style={{ fontSize, lineHeight: 1 }}
      >
        <CharMorphText testId="git-status-label">{label}</CharMorphText>
      </ShimmerText>
    );

  const revealPr = pr ?? (hasPrSegment ? undefined : lastPrRef.current);
  const prText = revealPr ? (
    /* A new PR shares most of its digits with the old one, so it moves like the
       label does rather than swapping under a number the user was reading. */
    <PillText fontSize={fontSize}>
      <CharMorphText testId="git-status-pr-number" style={TABULAR_NUMS}>{`#${String(revealPr.number)}`}</CharMorphText>
    </PillText>
  ) : null;
  const prSegment = (
    <HStack gap={1} vAlign="center" style={{ flex: '0 0 auto' }}>
      <MorphGlyph id={isPrHovered && glyphs.openPr != null ? 'open-pr' : 'branch'} size={14}>
        {isPrHovered && glyphs.openPr != null ? glyphs.openPr : glyphs.branch}
      </MorphGlyph>
      {prText}
    </HStack>
  );
  const EDGE = isChrome ? 'var(--spacing-2)' : 'var(--spacing-1-5)';
  const DIVIDER = 'var(--studio-git-divider-gap)';
  /* A point, not an Astryx `gap` step. On the glyph box, so it closes with it. */
  const LEADING_GAP_PX = 6;
  const hasLabelCell = scale !== 'card';
  const prStart = hasLabelCell ? DIVIDER : EDGE;
  const prEnd = prStart;
  /** Always mounted at chrome scale — see `Reveal`. */
  const hasReveal = isChrome || hasPrSegment;
  const prCell = (() => {
    if (!hasReveal) return null;
    if (!revealPr || !onOpenPr || !isChrome)
      return (
        <span className={CELL_CLASS} style={cellStyle(false, prStart, prEnd)}>
          {prSegment}
        </span>
      );
    const openPr = revealPr;
    return (
      <button
        type="button"
        className={CELL_CLASS}
        data-interactive="true"
        aria-label={fill(strings.openPrAria, { number: openPr.number })}
        data-testid="git-status-pr-link"
        {...(hasPrSegment ? {} : { tabIndex: -1, 'aria-hidden': 'true' as const })}
        onClick={() => onOpenPr(openPr.url)}
        onMouseEnter={() => setIsPrHovered(true)}
        onMouseLeave={() => setIsPrHovered(false)}
        style={cellStyle(true, prStart, prEnd)}
      >
        {prSegment}
      </button>
    );
  })();

  // `false` also hides a tooltip already up when the menu opened; `undefined` hands the layer back to hover.
  const forcedOpen = isTooltipOpen ? true : isMenuOpen ? false : undefined;
  const bodyProps = bodyPropsFor(label, { isWorking });

  /** Identity is what the mark MEANS, so a state that keeps its mark does not re-fade it. */
  const leadingGlyph = (() => {
    if (isWorking) return glyphs.working == null ? undefined : { id: 'working', node: glyphs.working };
    return glyphs.leading == null ? undefined : { id: `leading:${state.id}`, node: glyphs.leading };
  })();

  const labelCell = hasLabelCell ? (
    <HStack
      {...bodyProps}
      className={CELL_CLASS}
      onClick={action === undefined && isChrome ? onNoActionPress : undefined}
      {...(action === undefined ? {} : { 'data-interactive': 'true' })}
      onMouseEnter={() => setIsBodyHovered(true)}
      onMouseLeave={() => setIsBodyHovered(false)}
      vAlign="center"
      style={{ ...cellStyle(action !== undefined, hasPrSegment ? prEnd : EDGE, hasPrSegment || dropdown ? DIVIDER : EDGE), position: 'relative' }}
    >
      {/* Keyed by the STATE: `leading` is a fresh element every render. */}
      <MorphGlyph id={leadingGlyph?.id} size={14} gap={LEADING_GAP_PX}>
        {leadingGlyph?.node}
      </MorphGlyph>
      {labelNode}
      {action === undefined || label === undefined ? null : (
        /* Named by `aria-label`: the letters it covers are aria-hidden. */
        <button
          type="button"
          aria-label={label}
          data-testid="git-status-body-press"
          onClick={action}
          style={{ ...INERT_BUTTON, position: 'absolute', inset: 0, cursor: 'pointer' }}
        />
      )}
    </HStack>
  ) : null;

  /** Not around the chevron: the menu's popover renders inside the subtree and mouseenter follows the DOM, so a wrapping tooltip fires on the open menu. */
  const withTooltip = (anchor: React.ReactNode, lines: readonly string[] | undefined, lead?: string): React.ReactNode => {
    const facts = lines && lines.length > 0 ? lines.join(` ${strings.separator} `) : undefined;
    if (facts === undefined && lead === undefined) return anchor;
    return (
      <Tooltip
        content={lead === undefined ? facts : facts === undefined ? lead : <>{lead}<br />{facts}</>}
        placement="below"
        focusTrigger="always"
        hasHoverIndication={false}
        isEnabled={!isMenuOpen}
        {...(onTooltipOpenChange ? { onOpenChange: onTooltipOpenChange } : {})}
        {...(forcedOpen === undefined ? {} : { isOpen: forcedOpen })}
      >
        {anchor}
      </Tooltip>
    );
  };
  const hoverLines = hoverLinesFor(state, shownFailure ? [shownFailure.nextStep] : tooltip, showsQueued ? strings.queuedHint : undefined);
  const noAccessLine = state.id === 'no-access' ? fill(strings.noAccessLine, { repo: state.repo, account: state.account }) : undefined;

  return (
    <HStack
      vAlign="center"
      className={className}
      data-testid={testId ?? 'git-status-pill'}
      data-git-state={state.id}
      data-failure={shownFailure === undefined ? undefined : 'true'}
      data-git-scale={scale}
      data-stale={state.mode === 'stale' ? 'true' : undefined}
      data-working={isWorking ? 'true' : undefined}
      data-queued={showsQueued ? 'true' : undefined}
      style={{
        height,
        flex: '0 0 auto',
        borderRadius: 'var(--radius-element)',
        ...SQUIRCLE,
        boxShadow: `inset 0 0 0 0.5px ${look.ring ?? look.border}`,
        background: look.fill,
        color: look.ink,
        overflow: 'hidden',
        transition: `background-color ${LOOK_EASE}, color ${LOOK_EASE}, box-shadow ${LOOK_EASE}`,
        ...({
          '--studio-git-cell-hover': cellHoverOf(state, look),
          '--studio-git-cell-hover-ink': cellHoverInkOf(state),
        } as CSSProperties),
        ...style,
      }}
    >
      {/* Hoisted by React, so N pills on a board still ship one copy. */}
      <style href={CELL_HOVER_HREF} precedence="medium">
        {CELL_HOVER_RULES}
      </style>
      {withTooltip(labelCell, hoverLines.label, noAccessLine)}
      {revealDropdown === undefined ? null : (
        <Reveal isOpen={dropdown !== undefined} testId="git-status-menu-reveal">
          {menuDivider}
          <DropdownControl
            id={revealDropdown}
            current={current}
            strings={strings}
            glyphs={glyphs}
            onPick={onPick}
            onOpenChange={handleMenuOpenChange}
            isReachable={dropdown !== undefined}
          />
        </Reveal>
      )}
      {prCell === null ? null : (
        <Reveal isOpen={hasPrSegment} testId="git-status-reveal">
          {hasLabelCell && divider}
          {withTooltip(prCell, hoverLines.pr)}
        </Reveal>
      )}
    </HStack>
  );
}
