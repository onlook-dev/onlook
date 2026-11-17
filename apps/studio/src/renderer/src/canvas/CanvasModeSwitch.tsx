import { useCallback, useRef, useState } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';

import { PlayGlyph, SquareCursorGlyph } from '../icons/glyphs.js';
import { t, type StringKey } from '@studio/i18n';
import { useShortcut, type ShortcutId } from '../shortcuts/index.js';
import { ToolHint } from './ToolHint.js';
import { useCanvasStore, type CanvasMode } from './store.js';

// Composed, not `SegmentedControl`/`TabList`: the design's top-edge bar needs a StyleX swizzle of an internal child, and with no compiler here it renders unstyled, silently.

const INDICATOR_HEIGHT = '3px';
const LABEL_PADDING_INLINE = '10px';

const MODES: ReadonlyArray<{
  value: CanvasMode;
  label: StringKey;
  shortcut: ShortcutId;
  glyph: typeof PlayGlyph;
}> = [
  { value: 'design', label: 'canvas.mode.design', shortcut: 'canvas.mode-design', glyph: SquareCursorGlyph },
  { value: 'interact', label: 'canvas.mode.interact', shortcut: 'canvas.mode-interact', glyph: PlayGlyph },
];

const BUTTON_RESET = {
  appearance: 'none',
  background: 'transparent',
  border: 0,
  padding: 0,
  margin: 0,
  font: 'inherit',
  textAlign: 'inherit',
  cursor: 'pointer',
} as const;

interface ModeSwitchProps {
  value: CanvasMode;
  onChange: (value: CanvasMode) => void;
}

interface ModeTabProps {
  mode: (typeof MODES)[number];
  isActive: boolean;
  isFocusVisible: boolean;
  onSelect: (value: CanvasMode) => void;
  onFocusVisible: (value: CanvasMode | null) => void;
  registerRef: (value: CanvasMode, el: HTMLButtonElement | null) => void;
}

function ModeTab({
  mode,
  isActive,
  isFocusVisible,
  onSelect,
  onFocusVisible,
  registerRef,
}: ModeTabProps): React.JSX.Element {
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const color = isActive
    ? 'var(--color-text-primary)'
    : isHovered
      ? 'var(--color-text-secondary)'
      : 'var(--color-text-gray)';

  return (
    <Tooltip
      content={<ToolHint label={t(mode.label)} shortcut={mode.shortcut} />}
      placement="below"
      // The button fills the band; anchored there, the hint lands under the band's bottom edge.
      anchorRef={labelRef}
    >
    <Stack
      as="button"
      ref={(el: HTMLElement | null) => registerRef(mode.value, el as HTMLButtonElement | null)}
      direction="vertical"
      align="center"
      justify="start"
      gap={4}
      height="100%"
      role="radio"
      aria-checked={isActive}
      tabIndex={isActive ? 0 : -1}
      data-mode={mode.value}
      onClick={() => {
        onSelect(mode.value);
      }}
      onPointerEnter={() => {
        setIsHovered(true);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
      }}
      // `:focus-visible` is not applied yet while the focus event dispatches; it reads true one frame later.
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        const el = e.currentTarget;
        requestAnimationFrame(() => {
          onFocusVisible(el.matches(':focus-visible') ? mode.value : null);
        });
      }}
      onBlur={() => {
        onFocusVisible(null);
      }}
      style={{
        ...BUTTON_RESET,
        color,
        // The focus ring is drawn on the label box below; the UA ring here is clipped by the band edge.
        outline: 'none',
      }}
    >
      <Stack
        aria-hidden="true"
        width="100%"
        height={INDICATOR_HEIGHT}
        style={{
          backgroundColor: 'var(--color-text-primary)',
          opacity: isActive ? 1 : 0,
        }}
      />
      <HStack
        ref={labelRef}
        align="center"
        justify="center"
        gap={2}
        style={{
          paddingInline: LABEL_PADDING_INLINE,
          outline: isFocusVisible ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: '2px',
          borderRadius: 'var(--radius-inner)',
          // The label is never darker than the frame under it; a brighter backdrop swallowing an inactive label is the accepted trade.
          mixBlendMode: 'lighten',
        }}
      >
        <Icon icon={mode.glyph} size="sm" color="inherit" />
        <Text type="label" color="inherit" textWrap="nowrap">
          {t(mode.label)}
        </Text>
      </HStack>
    </Stack>
    </Tooltip>
  );
}

function ModeSwitch({ value, onChange }: ModeSwitchProps): React.JSX.Element {
  const [focusVisible, setFocusVisible] = useState<CanvasMode | null>(null);
  const refs = useRef(new Map<CanvasMode, HTMLButtonElement>());

  const registerRef = useCallback((mode: CanvasMode, el: HTMLButtonElement | null) => {
    if (el) refs.current.set(mode, el);
    else refs.current.delete(mode);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const index = MODES.findIndex((m) => m.value === value);
      let next = index;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % MODES.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        next = (index - 1 + MODES.length) % MODES.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = MODES.length - 1;
      else return;

      e.preventDefault();
      const target = MODES[next];
      if (!target || target.value === value) return;
      onChange(target.value);
      refs.current.get(target.value)?.focus();
    },
    [onChange, value],
  );

  return (
    <HStack
      role="radiogroup"
      aria-label={t('canvas.mode.label')}
      gap={4}
      align="stretch"
      height="100%"
      onKeyDown={onKeyDown}
      // The mode band is `pointer-events: none`; without this opt-in the switch renders and cannot be clicked.
      style={{ pointerEvents: 'auto' }}
      data-testid="canvas-mode"
      data-mode={value}
    >
      {MODES.map((mode) => (
        <ModeTab
          key={mode.value}
          mode={mode}
          isActive={mode.value === value}
          isFocusVisible={focusVisible === mode.value}
          onSelect={onChange}
          onFocusVisible={setFocusVisible}
          registerRef={registerRef}
        />
      ))}
    </HStack>
  );
}

export function CanvasModeSwitch(): React.JSX.Element {
  const mode = useCanvasStore((state) => state.mode);
  const setMode = useCanvasStore((state) => state.setMode);
  useShortcut('canvas.mode-design', () => setMode('design'));
  useShortcut('canvas.mode-interact', () => setMode('interact'));

  return <ModeSwitch value={mode} onChange={setMode} />;
}
