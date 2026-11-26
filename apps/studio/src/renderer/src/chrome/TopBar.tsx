import { HStack, Stack } from '@astryxdesign/core/Layout';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChromeSlots, TabPreview, TabStatus, WindowControlsEdge } from '@studio/events';
import { GitStatusPill, type GitDropdownOption } from '@studio/git-ui';
import { pillStateOf } from '@studio/git-ui/derive';

import {
  ProjectsIcon,
  RailLeftClosedIcon,
  RailLeftOpenIcon,
  RailRightClosedIcon,
  RailRightOpenIcon,
} from '../icons/glyphs.js';
import { GIT_PILL_GLYPHS, GIT_PR_FAILURE_STRINGS, GIT_STATUS_STRINGS, leadingFor } from '../git-status/presentation.js';
import { drawsPill, isPressable, tooltipFor } from '../git-status/press.js';
import { t } from '@studio/i18n';
import { REGION } from '../layout.js';
import { useChromeExpansion, useHoverExpansion } from './expansion.js';
import { TabStrip } from './tabs/TabStrip.js';
import type { StudioTab } from './tabs/Tab.js';
import { UpdatePill } from './UpdatePill.js';
import { AppMenu, APP_MENU_LOOK } from './AppMenu.js';
import { StatusDot } from './StatusDot.js';
import { LAYER } from '../overlay/layers.js';
import './chrome.css';

const BAND_FILL = 'var(--studio-band)';
/** Onboarding paints `--studio-ground` to the window's top edge; the band takes the same fill rather than capping it (ONL-2625). */
const SCREEN_FILL = 'var(--studio-ground)';

// Astryx `gap` props are scale steps, not pixels (`gap={6}` renders 24px), so every gap here is a `style` value.
const BAND_INSET = 8;
/** The right edge matches the pill's top gap, so its corner sits concentric with the window's (5 = (36 - 26) / 2). */
const BAND_END_INSET = 5;
/** Rounder than the window corner less that inset: the exact value read too square beside it. */
const PILL_CORNER = 14;
/** Where the band's corner is not the window's, the pill keeps its own even corners (ONL-3127). */
const PILL_CORNER_EVEN = 'var(--radius-element)';
const BAND_GAP = 8;

// Measured on a real window under `hiddenInset`: the lights end at x 71.2. The design file cannot answer this (ONL-2206).
const LIGHTS_END = 72;

const CONTROLS_W = LIGHTS_END - BAND_INSET;
const CONTROLS_H = 12;

// Tuned to the 20 glyph, not the file's 2: the ink rhythm is 20.25. Moves with the glyph size.
const CLUSTER_GAP = 12;
const ICON_GAP = 5;

const ICON_BUTTON = 32;
const ICON_BUTTON_H = 28;

// Under the native lights, which still take every press. Focused, a sub-point misalignment would ring the coloured lights in grey.
const LIGHT_SIZE = 13.5;
const LIGHT_PITCH = 23;
const LIGHT_FIRST = 11.8 - BAND_INSET;

function InactiveLights(): React.JSX.Element {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <Stack
          key={index}
          style={{
            position: 'absolute',
            left: LIGHT_FIRST + index * LIGHT_PITCH,
            top: '50%',
            width: LIGHT_SIZE,
            height: LIGHT_SIZE,
            transform: 'translateY(-50%)',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-icon-disabled)',
          }}
        />
      ))}
    </>
  );
}

export interface TopBarProps {
  windowControls?: WindowControlsEdge;
  tabs: readonly StudioTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onNewDraft?: () => void;
  isCreatingDraft?: boolean;
  canReopen?: boolean;
  onReopenTab?: () => void;
  onRenameTab: (id: string, name: string) => void;
  onReorderTab?: (id: string, toIndex: number) => void;
  onReloadTab: (id: string) => void;
  onPreviewTab?: (id: string) => Promise<TabPreview>;
  canCreate: boolean;
  isHome: boolean;
  isWindowFocused?: boolean;
  isChordHintHeld?: boolean;
  slots: ChromeSlots;
  onFolder: () => void;
  onToggleRail: (side: 'left' | 'right') => void;
  onGitAction: () => void;
  onGitPick: (option: GitDropdownOption) => void;
}

export function BandIconButton({
  icon, label, testId, isInert = false, isSelected = false, swapsView = false, status, onPress,
}: {
  icon: IconType;
  label: string;
  testId: string;
  isInert?: boolean;
  isSelected?: boolean;
  swapsView?: boolean;
  status?: TabStatus;
  onPress: () => void;
}): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const isLit = isHovered && !isInert;
  const hover = useHoverExpansion();
  const [isSuppressed, setIsSuppressed] = useState(false);
  const rearm = (): void => setIsSuppressed(false);
  const control = (
    <Stack
      as="button"
      aria-label={label}
      aria-disabled={isInert ? true : undefined}
      aria-pressed={isSelected ? true : undefined}
      data-testid={testId}
      onClick={isInert ? undefined : () => {
        // No pointer-leave follows a view swap, so the tooltip's hide never fires and the claim is never released.
        if (swapsView) {
          setIsSuppressed(true);
          hover.dismiss();
        }
        onPress();
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        // A press that did not move the view leaves the pointer here.
        rearm();
        // An inert control's tooltip is forced closed; growing for it puts an invisible strip over the app.
        if (!isInert) hover.onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        rearm();
        hover.onMouseLeave();
      }}
      // Inside the drag surface: without this it is unclickable.
      className="region-no-drag"
      align="center"
      justify="center"
      style={{
        appearance: 'none', border: 'none', margin: 0, padding: 0, font: 'inherit',
        cursor: isInert ? 'default' : 'pointer', flex: '0 0 auto',
        position: 'relative',
        width: ICON_BUTTON, height: ICON_BUTTON_H,
        borderRadius: 'var(--radius-element)',
        background: isLit || isSelected ? 'var(--color-overlay-pressed)' : 'transparent',
      }}
    >
      <Icon icon={icon} size="md" color={isSelected || isLit ? 'primary' : isInert ? 'tertiary' : 'secondary'} />
      {status === undefined ? null : (
        <Stack style={{ position: 'absolute', top: 0, insetInlineEnd: 0 }}>
          <StatusDot testId={`${testId}-status`} gap={0} status={status} />
        </Stack>
      )}
    </Stack>
  );

  return (
    <Tooltip
      content={label}
      placement="below"
      focusTrigger="always"
      hasHoverIndication={false}
      /* `isOpen`, not `isEnabled`: `isEnabled` cannot hide a tooltip already on screen (@astryxdesign/core 0.1.9). */
      isOpen={isSuppressed || isInert ? false : undefined}
      onOpenChange={hover.onOpenChange}
    >
      {control}
    </Tooltip>
  );
}

// Spelled out: a template-literal key is invisible to `check:strings`.
const RAIL_LABEL = {
  left: { hide: 'topbar.rail.left.hide', show: 'topbar.rail.left.show' },
  right: { hide: 'topbar.rail.right.hide', show: 'topbar.rail.right.show' },
} as const;

function RailToggle({
  side, isHidden, isInert, status, onPress,
}: {
  side: 'left' | 'right';
  isHidden: boolean;
  isInert: boolean;
  status?: TabStatus;
  onPress: () => void;
}): React.JSX.Element {
  const icon = isHidden
    ? (side === 'left' ? RailLeftClosedIcon : RailRightClosedIcon)
    : (side === 'left' ? RailLeftOpenIcon : RailRightOpenIcon);
  const key = RAIL_LABEL[side][isHidden ? 'show' : 'hide'];
  return (
    <BandIconButton
      icon={icon}
      label={t(key)}
      testId={`topbar-rail-${side}`}
      isInert={isInert}
      {...(status === undefined ? {} : { status })}
      onPress={onPress}
    />
  );
}

function ProjectedGitPill({
  git, onAction, onPick, corner = PILL_CORNER,
}: {
  git: NonNullable<ChromeSlots['git']>;
  corner?: number | string;
  onAction: () => void;
  onPick: (option: GitDropdownOption) => void;
}): React.JSX.Element | null {
  const state = useMemo(
    () => pillStateOf(git.row, git.defaults, git.isWorking, git.workingAction),
    [git.row, git.defaults, git.isWorking, git.workingAction],
  );
  const tooltip = useMemo(() => tooltipFor(git.row), [git.row]);
  const hover = useHoverExpansion();
  const menu = useChromeExpansion();
  if (!drawsPill(git.row)) return null;
  const leading = leadingFor(state.id);
  const glyphs = leading ? { ...GIT_PILL_GLYPHS, leading } : GIT_PILL_GLYPHS;
  const pressable = isPressable(state, git.canSubmit);
  return (
    <Stack onMouseEnter={hover.onMouseEnter} onMouseLeave={hover.onMouseLeave} style={{ flex: '0 0 auto' }}>
      <GitStatusPill
        state={state}
        strings={GIT_STATUS_STRINGS}
        failure={git.failure === undefined ? undefined : GIT_PR_FAILURE_STRINGS[git.failure]}
        glyphs={glyphs}
        tooltip={tooltip}
        onTooltipOpenChange={hover.onOpenChange}
        /* Full window: the menu's light dismiss only sees a click that lands in this page. */
        onMenuOpenChange={(isOpen) => (isOpen ? menu.claim({ kind: 'full' }) : menu.release())}
        onAction={pressable ? onAction : undefined}
        onNoActionPress={onAction}
        isQueued={git.queuedAction !== undefined}
        onOpenPr={(url) => window.open(url, '_blank', 'noopener')}
        onPick={onPick}
        className="region-no-drag"
        testId="topbar-git-status"
        style={{ borderTopRightRadius: corner }}
      />
    </Stack>
  );
}

export function TopBar(props: TopBarProps): React.JSX.Element {
  return (
    <TopBarView
      {...props}
      update={<UpdatePill gap={CLUSTER_GAP} />}
      appMenu={<AppMenu hasRails={props.slots.rails !== undefined} />}
    />
  );
}

/** The chevron and Windows' caption buttons. The reserve is a constant: on Electron 43 a `BaseWindow`'s views get no `titlebar-area` rect. */
function WindowEnd({ appMenu, hasRule }: { appMenu: ReactNode; hasRule: boolean }): React.JSX.Element {
  return (
    <HStack
      align="start"
      data-testid="topbar-window-end"
      style={{
        position: 'relative', alignSelf: 'stretch', flex: '0 0 auto',
        marginInlineStart: CLUSTER_GAP - BAND_GAP,
        paddingInlineEnd: APP_MENU_LOOK.captionButtonsWidth,
      }}
    >
      {appMenu}
      {/* Its own element over the chevron's fill, so a hover never washes it out and the glyph stays centred in its cell. */}
      {hasRule ? (
        <span
          aria-hidden="true"
          data-testid="topbar-window-end-rule"
          style={{
            position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, zIndex: LAYER.raised,
            width: 'var(--border-width)', background: APP_MENU_LOOK.rule, pointerEvents: 'none',
          }}
        />
      ) : null}
    </HStack>
  );
}

export function TopBarView({
  tabs, activeTabId, onSelectTab, onCloseTab, onNewTab, onNewDraft, canReopen = false, onReopenTab, onRenameTab, onReloadTab, onPreviewTab,
  onReorderTab, canCreate, isHome, isCreatingDraft = false, isWindowFocused = true, isChordHintHeld = false, windowControls = 'leading', slots, onFolder, onToggleRail, onGitAction, onGitPick, update,
  appMenu = null,
}: TopBarProps & { update: ReactNode; appMenu?: ReactNode }): React.JSX.Element {
  const [isTabDragging, setIsTabDragging] = useState(false);
  // A set, not a boolean: the layer library fires no hide on unmount, and a claim held for a closed tab leaves the grown view swallowing the app's clicks.
  const stripHover = useHoverExpansion();
  const openTriggers = useRef<Set<string>>(new Set());
  const hoverRef = useRef(stripHover);
  useEffect(() => { hoverRef.current = stripHover; });
  const onTabTooltipOpenChange = useCallback((id: string, isOpen: boolean): void => {
    const open = openTriggers.current;
    if (isOpen) open.add(id);
    else open.delete(id);
    hoverRef.current.onOpenChange(open.size > 0);
  }, []);
  const blendsIntoScreen = slots.blendsIntoScreen === true;
  return (
    <Stack
      direction="horizontal"
      align="center"
      className="region-drag"
      style={{
        position: 'relative', width: '100%', height: REGION.topBar,
        flex: `0 0 ${REGION.topBar}px`, background: blendsIntoScreen ? SCREEN_FILL : BAND_FILL,
        paddingInlineStart: BAND_INSET, paddingInlineEnd: windowControls === 'trailing' ? 0 : BAND_END_INSET, gap: BAND_GAP, boxSizing: 'border-box',
      }}
      data-testid="topbar"
    >
        {/* Quieted mid-drag: each control claims a chrome-view resize on pointer-enter, and crossing them made the drag stutter (ONL-2364). `-webkit-app-region` is unaffected. */}
        <HStack align="center" style={{ gap: CLUSTER_GAP, flex: '0 0 auto', pointerEvents: isTabDragging ? 'none' : undefined }}>
          {windowControls === 'leading' ? <Stack aria-hidden="true" style={{ position: 'relative', width: CONTROLS_W, height: CONTROLS_H, flex: '0 0 auto' }}>
            {isWindowFocused ? null : <InactiveLights />}
          </Stack> : null}
          {slots.showFolder === undefined ? null : <HStack align="center" style={{ gap: ICON_GAP, flex: '0 0 auto' }}>
            <BandIconButton
              icon={ProjectsIcon}
              label={t('topbar.folder')}
              testId="topbar-folder"
              swapsView
              isInert={isHome || !slots.showFolder}
              isSelected={isHome}
              onPress={onFolder}
            />
            {/* Always mounted, inert until the tab reports its rails, so a reload never shifts the band (ONL-2744). */}
            <RailToggle side="left" isHidden={slots.rails?.left ?? false} isInert={isHome || slots.rails === undefined} onPress={() => onToggleRail('left')} />
          </HStack>}
          {/* A window fact, not the active tab's, so not a slot (ONL-1935). */}
          {update}
        </HStack>
        {slots.tabsHidden ? null : <Stack
          justify="center"
          style={{ height: '100%', minWidth: 0, flex: '0 1 auto' }}
        >
          <TabStrip
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={onSelectTab}
            onClose={onCloseTab}
            onNew={onNewTab}
            isCreatingDraft={isCreatingDraft}
            {...(onNewDraft ? { onNewDraft } : {})}
            canNewInWorkspace={!isHome}
            canReopen={canReopen}
            {...(onReopenTab ? { onReopen: onReopenTab } : {})}
            canCreate={canCreate}
            onRename={onRenameTab}
            isChordHintHeld={isChordHintHeld}
            {...(onReorderTab ? { onReorder: onReorderTab } : {})}
            onDragActive={setIsTabDragging}
            onReload={onReloadTab}
            {...(onPreviewTab ? { onPreview: onPreviewTab } : {})}
            onTabTooltipOpenChange={onTabTooltipOpenChange}
          />
        </Stack>}
        {/* Fills a bar with room to spare and closes to nothing under a full strip, and takes both band gaps with it, so the `+` sits against the right controls. */}
        <Stack aria-hidden="true" style={{ flex: '1 0 0', minWidth: 0, marginInline: -BAND_GAP }} />

      <HStack align="center" style={{ flex: '0 0 auto', gap: BAND_GAP, pointerEvents: isTabDragging ? 'none' : undefined }}>
        {slots.showFolder === undefined ? null : <RailToggle
          side="right"
          isHidden={slots.rails?.right ?? false}
          isInert={isHome || slots.rails === undefined}
          {...(slots.rails?.rightStatus === undefined ? {} : { status: slots.rails.rightStatus })}
          onPress={() => onToggleRail('right')}
        />}
        {slots.git ? (
          <ProjectedGitPill
            git={slots.git}
            onAction={onGitAction}
            onPick={onGitPick}
            corner={windowControls === 'trailing' ? PILL_CORNER_EVEN : PILL_CORNER}
          />
        ) : null}
      </HStack>
      {windowControls === 'trailing' ? <WindowEnd appMenu={appMenu} hasRule={!blendsIntoScreen} /> : null}

      {/* A last child, not a border: a border paints under the active tab's fill and takes 0.5px out of the 36 box. */}
      {blendsIntoScreen ? null : (
        <span
          aria-hidden="true"
          data-testid="topbar-divider"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: '0.5px', background: 'var(--color-border)',
            pointerEvents: 'none',
            // Its own layer: on the transparent window the first frame dropped this line until a repaint.
            willChange: 'transform',
          }}
        />
      )}
    </Stack>
  );
}
