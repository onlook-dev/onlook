import { memo, useState, type RefObject } from 'react';
import type { WebviewTag } from 'electron';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Divider } from '@astryxdesign/core/Divider';
import { ShimmerText } from '@studio/chat-ui';
import { Submenu } from '../../menu/Submenu.jsx';
import { t } from '@studio/i18n';
import { MENU_SURFACE, MenuKeyHint } from '../../menu/surface.js';
import { shortcutGlyph } from '../../shortcuts/glyphs.js';
import { displayUrl, normalizeDevUrl } from '@studio/events';
import type { FrameNodeData } from '../model.js';
import { useCanvasStore } from '../store.js';
import { FRAME_PRESETS, presetDimensions } from './presets.js';
import { leadingControlSurplus } from './geometry.js';
import {
  BackIcon,
  ForwardIcon,
  MoreIcon,
  OpenExternalIcon,
  PlusIcon,
  ReloadIcon,
} from '../../icons/glyphs.js';
import '../canvas.css';

interface FrameToolbarProps {
  frameId: string;
  data: FrameNodeData;
  webviewRef: RefObject<WebviewTag | null>;
  isAddressOccluded: boolean;
  compact: boolean;
  /** The ring's own emphasis, so the URL takes the accent whenever the border does. */
  isAccented: boolean;
  /** Only the one selected frame carries controls; the rest show their name. */
  hasControls: boolean;
  onRefresh: (bypassCache: boolean) => void;
  refreshNonce: number;
}

export const NAV_CONTROL = {
  height: 'var(--spacing-6)',
  width: 'var(--spacing-6)',
  // Without it `IconButton` re-inflates the box to its own `--size-element-*`.
  minWidth: 'var(--spacing-6)',
  padding: 0,
} as const;

const GLYPH_14 = { width: 14, height: 14 } as const;

// Opaque, superseding the design's translucent white: the editing input read see-through over frame content (ONL-2046).
const ADDRESS_FILL = 'var(--color-background-gray)';

const ADDRESS_HEIGHT = 23;

/** The ring's accent lifted toward white: text on the dark canvas reads thinner than the line beside it. */
const ACCENT_LABEL = 'color-mix(in oklch, var(--color-accent), white 25%)';

// Hidden, not unmounted: the groups still hold their width, so the name stays centred on the frame.
const HIDDEN_GROUP = { visibility: 'hidden' } as const;

// Symmetric and applied at rest too, so the URL does not move when the `↗` appears.
const URL_RESERVE = 'var(--spacing-5)';

// The memo is load-bearing: `FrameNode` re-renders every frame on each zoom tick, and a prop rebuilt per render brings the crawl back.
export const FrameToolbar = memo(function FrameToolbar({
  frameId,
  data,
  webviewRef,
  isAddressOccluded,
  compact,
  isAccented,
  hasControls,
  onRefresh,
  refreshNonce,
}: FrameToolbarProps): React.JSX.Element {
  const removeFrame = useCanvasStore((state) => state.removeFrame);
  const commitAddress = useCanvasStore((state) => state.commitAddress);
  const resizeFrame = useCanvasStore((state) => state.resizeFrame);
  const duplicateFrame = useCanvasStore((state) => state.duplicateFrame);
  const openInNewFrame = useCanvasStore((state) => state.openInNewFrame);
  const beginRename = useCanvasStore((state) => state.beginRename);

  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [isPointerOver, setIsPointerOver] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isEditing = draft !== undefined;
  // The frame's durable name at rest, as the Designs panel shows it; a name that is only the default address yields to the page's title. The URL shows once the field opens, or when nothing else names the frame.
  const restingText = restingLabel(data);
  const isHovered = isPointerOver && !isEditing;

  function withWebview(fn: (view: WebviewTag) => void): boolean {
    const view = webviewRef.current;
    if (!view) return false;
    try {
      fn(view);
      return true;
    } catch {
      // The guest is not attached yet, or is gone.
      return false;
    }
  }

  function beginEdit(): void {
    setDraft(data.currentUrl);
  }

  function commitEdit(): void {
    if (draft === undefined) return;
    const url = normalizeDevUrl(draft);
    // An unparseable address keeps the field open with what was typed; reverting reads as the app ignoring the user.
    if (url === null) return;
    // The navigation goes through the store's request, never `loadURL` on the guest, so one field answers where the frame is pointed (ONL-1941).
    commitAddress(frameId, url);
    setDraft(undefined);
  }

  function commitToNewFrame(): void {
    if (draft === undefined) return;
    const url = normalizeDevUrl(draft);
    if (url === null) return;
    openInNewFrame(frameId, url);
    setDraft(undefined);
  }

  function openExternal(): void {
    window.open(data.currentUrl, '_blank');
  }

  return (
    <HStack
      gap={2}
      vAlign="center"
      width="100%"
      height="var(--spacing-6)"
      aria-label={t('frame.label', { url: data.currentUrl })}
      data-testid="frame-toolbar"
    >
      {!compact && (
        <HStack vAlign="center" gap={0} className="nodrag" style={{ flex: '1 1 0', ...(hasControls ? {} : HIDDEN_GROUP) }}>
          {/* Back/forward render only with history; a disabled ghost was noise. */}
          {data.canGoBack && (
            <IconButton
              label={t('frame.nav.back')}
              tooltip={t('frame.nav.back')}
              variant="ghost"
              size="sm"
              className="frame-nav-control"
              style={NAV_CONTROL}
              icon={<Icon icon={BackIcon} size="sm" color="inherit" />}
              data-testid="frame-back"
              onClick={() => {
                withWebview((view) => {
                  view.goBack();
                });
              }}
            />
          )}
          {data.canGoForward && (
            <IconButton
              label={t('frame.nav.forward')}
              tooltip={t('frame.nav.forward')}
              variant="ghost"
              size="sm"
              className="frame-nav-control"
              style={NAV_CONTROL}
              icon={<Icon icon={ForwardIcon} size="sm" color="inherit" />}
              data-testid="frame-forward"
              onClick={() => {
                withWebview((view) => {
                  view.goForward();
                });
              }}
            />
          )}
          <IconButton
            label={t('frame.nav.reload')}
            tooltip={t('frame.nav.reload')}
            variant="ghost"
            size="sm"
            className="frame-nav-control"
            style={NAV_CONTROL}
            icon={
              <Icon
                // A fresh `key` per refresh re-runs the animation; toggling the class alone does not.
                key={refreshNonce}
                icon={ReloadIcon}
                size="sm"
                color="inherit"
                {...(refreshNonce > 0 ? { className: 'frame-reload-turn' } : {})}
              />
            }
            data-testid="frame-reload"
            onClick={() => {
              onRefresh(false);
            }}
          />
        </HStack>
      )}

      {/* `nodrag` only while editing: every other control carries it, so an unconditional one leaves the bar with no draggable surface; editing needs it because d3-drag takes the mousedown meant for the caret (ONL-1898). */}
      <HStack
        justify={isEditing ? 'start' : 'center'}
        vAlign="center"
        className={isEditing ? 'nodrag frame-address editing' : 'frame-address'}
        style={{
          flex: '1 1 auto',
          width: '100%',
          minWidth: 0,
          position: 'relative',
          ...(compact ? { marginInline: 'calc(-1 * var(--border-width))' } : {}),
          // The cursor is on `.frame-address` in styles.css; an inline one would beat the drag-from-pill `grabbing` rule.
          borderRadius: 'var(--radius-full)',
          background: isEditing || isHovered ? ADDRESS_FILL : undefined,
          height: ADDRESS_HEIGHT,
          paddingBlock: 'var(--spacing-1)',
          paddingInlineStart: isEditing ? 'var(--spacing-2)' : 'var(--spacing-1)',
          paddingInlineEnd: 'var(--spacing-1)',
          // Under the mode switch the pill slides beneath the frosted band and loses its hit target; it is not hidden (ONL-1904).
          ...(isAddressOccluded ? { pointerEvents: 'none' as const } : {}),
        }}
        data-testid="frame-url"
        data-state={
          isAddressOccluded ? 'occluded' : isEditing ? 'editing' : isHovered ? 'hover' : 'default'
        }
        onMouseEnter={() => {
          setIsPointerOver(true);
        }}
        onMouseLeave={() => {
          setIsPointerOver(false);
        }}
        // One click falls through to React Flow and selects the frame; the second opens the field.
        onDoubleClick={isEditing ? undefined : beginEdit}
      >
        {isEditing ? (
          <>
            {/* A native input, not `TextInput`: the pill is the field container, and `TextInput` brings its own border, background and 28px height — a field inside a field. */}
            <input
              aria-label={t('frame.url.label')}
              value={draft}
              autoFocus
              style={{ ...INPUT_STYLE, paddingInlineEnd: URL_RESERVE }}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitEdit();
                if (event.key === 'Escape') setDraft(undefined);
              }}
              // Blur abandons, never commits: a commit on blur retargets the frame on a stray click elsewhere.
              onBlur={() => {
                setDraft(undefined);
              }}
              data-testid="frame-url-input"
            />
            <IconButton
              label={t('frame.url.openInNewFrame')}
              tooltip={t('frame.url.openInNewFrame')}
              variant="ghost"
              size="sm"
              className="nodrag"
              style={OPEN_EXTERNAL_CONTROL}
              icon={<Icon icon={PlusIcon} size="sm" color="primary" style={GLYPH_14} />}
              data-testid="frame-open-in-new"
              // The input's blur abandons the draft and unmounts this button before its click fires.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={commitToNewFrame}
            />
          </>
        ) : (
          <>
            <ShimmerText
              isActive={data.working === true}
              size="sm"
              color={isAccented ? 'inherit' : isHovered ? 'primary' : 'secondary'}
              {...(isAccented ? { base: ACCENT_LABEL } : {})}
              maxLines={1}
              // The truncation `title` dumped a URL's whole query string over the page.
              hasTruncateTooltip={false}
              // Front ellipsis for a URL: `rtl` on the clipping box plus the LTR isolate inside, which keeps the URL's punctuation in order; `unicode-bidi: plaintext` reverts to LTR off the `l` of `localhost`. A title ellipsizes at its end.
              style={{
                minWidth: 0,
                ...(isAccented ? { color: ACCENT_LABEL } : {}),
                paddingLeft: compact ? 'var(--spacing-1)' : URL_RESERVE,
                // Physical, not logical: a URL's clipping box is `rtl`.
                paddingRight: compact ? 'var(--spacing-1)' : centringRightInset(data),
                ...(restingText === '' ? { direction: 'rtl' as const, textAlign: 'left' as const } : {}),
              }}
            >
              <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                {restingText === '' ? displayUrl(data.currentUrl) : restingText}
              </span>
            </ShimmerText>
            {isHovered && !compact && hasControls && (
              <IconButton
                label={t('frame.menu.openExternal')}
                tooltip={t('frame.menu.openExternal')}
                variant="ghost"
                size="sm"
                className="nodrag"
                style={OPEN_EXTERNAL_CONTROL}
                icon={<Icon icon={OpenExternalIcon} size="sm" color="primary" style={GLYPH_14} />}
                data-testid="frame-open-external"
                onClick={(event) => {
                  // The pill around this button opens the field on click (ONL-1898).
                  event.stopPropagation();
                  openExternal();
                }}
              />
            )}
          </>
        )}
      </HStack>

      {!compact && (
        <HStack className="nodrag" justify="end" style={{ flex: '1 1 0', ...(hasControls ? {} : HIDDEN_GROUP) }}>
          <DropdownMenu
            hasChevron={false}
            style={MENU_SURFACE}
            onOpenChange={setIsMenuOpen}
            button={{
              label: t('frame.menu.label'),
              tooltip: t('frame.menu.label'),
              variant: 'ghost',
              size: 'sm',
              isIconOnly: true,
              className: 'frame-nav-control',
              style: NAV_CONTROL,
              icon: <Icon icon={MoreIcon} size="sm" color="inherit" />,
            }}
          >
            {FRAME_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.labelKey}
                label={
                  <HStack vAlign="center" gap={2}>
                    <Text size="sm">{t(preset.labelKey)}</Text>
                    <Text size="sm" color="disabled">
                      {presetDimensions(preset)}
                    </Text>
                  </HStack>
                }
                endContent={<Icon icon={preset.icon} size="md" color="secondary" />}
                onClick={() => {
                  resizeFrame(frameId, preset.width, preset.height);
                }}
              />
            ))}
            <Divider isFullBleed />
            <DropdownMenuItem
              label={t('frame.menu.reload')}
              onClick={() => {
                onRefresh(false);
              }}
            />
            <Divider isFullBleed />
            <DropdownMenuItem label={t('frame.menu.openExternal')} onClick={openExternal} />
            <Submenu
              label={t('frame.menu.devtools.group')}
              isParentOpen={isMenuOpen}
              row={
                <DropdownMenuItem
                  label={t('frame.menu.devtools.group')}
                  endContent={<Icon icon={ForwardIcon} size="sm" color="secondary" />}
                />
              }
            >
              <DropdownMenuItem
                label={t('frame.menu.devtools')}
                onClick={() => {
                  withWebview((view) => {
                    view.openDevTools();
                  });
                }}
              />
              <DropdownMenuItem
                label={t('frame.menu.hardReload')}
                onClick={() => {
                  onRefresh(true);
                }}
              />
            </Submenu>
            <Divider isFullBleed />
            <DropdownMenuItem
              label={t('frame.menu.rename')}
              onClick={() => {
                beginRename(frameId);
              }}
            />
            <DropdownMenuItem
              label={t('frame.menu.duplicate')}
              endContent={<MenuKeyHint keys={shortcutGlyph('canvas.duplicate-frame')} />}
              onClick={() => {
                duplicateFrame(frameId);
              }}
            />
            <DropdownMenuItem
              label={t('frame.menu.remove')}
              endContent={<MenuKeyHint keys="⌫" />}
              onClick={() => {
                removeFrame(frameId);
              }}
            />
          </DropdownMenu>
        </HStack>
      )}
    </HStack>
  );
});

const OPEN_EXTERNAL_CONTROL: React.CSSProperties = {
  position: 'absolute',
  right: 1,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 21,
  height: 21,
  minWidth: 21,
  padding: 0,
  borderRadius: 'var(--radius-full)',
};

const INPUT_STYLE: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-body)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-normal)',
  caretColor: 'var(--color-text-primary)',
};

// The address centres between unequal groups, so the name gives back the left's surplus to sit on the frame's centre.
function centringRightInset(data: FrameNodeData): string {
  const surplus = leadingControlSurplus(data);
  return surplus === 0 ? URL_RESERVE : `calc(${URL_RESERVE} + ${String(surplus)} * ${NAV_CONTROL.width})`;
}

function restingLabel(data: FrameNodeData): string {
  const name = data.name.trim();
  const isDefaultName = name === displayUrl(data.homeUrl) || name === displayUrl(data.currentUrl);
  if (name !== '' && !isDefaultName) return name;
  return data.title.trim();
}
