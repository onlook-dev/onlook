import { Divider } from '@astryxdesign/core/Divider';
import { Stack, VStack } from '@astryxdesign/core/Layout';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';

import { t } from '@studio/i18n';
import { GlyphCode, GlyphFiles, GlyphArtifact } from '../icons/glyphs.js';
import { OnlookMark } from '../icons/OnlookMark.js';
import { REGION } from '../layout.js';
import { HAIRLINE, SURFACE } from '../panels/rowGeometry.js';
import { useCanvasStore } from '../canvas/store.js';
import { useSettingsStore } from '../settings/store.js';
import type { LeftPanelView } from './leftPanel.js';
import { railItems, type RailItem } from './railItems.js';

/** The canvas toolbar's control: `lg` for its 20px icon slot, height pinned back to `md` (ONL-2593). */
const GLYPH = 20;
export const RAIL_CONTROL = { height: 'var(--size-element-md)' } as const;
const ITEM_BOX = { width: 'var(--size-element-lg)', height: 'var(--size-element-md)' } as const;

const VIEW_GLYPH: Record<LeftPanelView, typeof GlyphFiles> = {
  designs: GlyphFiles,
  artifacts: GlyphArtifact,
  code: GlyphCode,
};

/** Separates the mark from the views it is not one of; `24` is the mock's own number, half the rail's width. */
const RULE_WIDTH = 24;

const CAPTION = {
  fontSize: 10,
  lineHeight: '12px',
  textAlign: 'center',
  whiteSpace: 'pre',
  pointerEvents: 'none',
  userSelect: 'none',
} as const;

function ViewToggle({ item, isActive }: { item: RailItem & { view: LeftPanelView }; isActive: boolean }): React.JSX.Element {
  const Glyph = VIEW_GLYPH[item.view];
  return (
    <VStack align="center" gap={1} style={{ paddingBlock: 4 }}>
      <ToggleButton
        value={item.view}
        label={t(item.label)}
        isIconOnly
        icon={<Glyph mode="raw" size={GLYPH} color="inherit" />}
        data-testid={`rail-view-${item.view}`}
        style={RAIL_CONTROL}
      />
      <span aria-hidden="true" style={{ ...CAPTION, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
        {t(item.caption ?? item.label)}
      </span>
    </VStack>
  );
}

export interface RailViewProps {
  codeEnabled?: boolean;
  view: LeftPanelView;
  onView: (view: LeftPanelView) => void;
  /** The mark, and whatever it opens. */
  head?: React.ReactNode;
  /** Help, and whatever it opens. */
  foot?: React.ReactNode;
}

/** Floats with the left panel and never enters layout flow; `App.tsx`'s aside carries the rail's width and the panel's together (ONL-1889, ONL-2563). */
export function RailView({ view, onView, head, foot, codeEnabled = false }: RailViewProps): React.JSX.Element {
  const items = railItems(codeEnabled);
  const views = items.filter(
    (item): item is RailItem & { view: LeftPanelView } => item.view !== undefined,
  );
  const mark = items.find((item) => item.place === 'head');
  const hasFoot = items.some((item) => item.place === 'foot');

  return (
    <VStack
      as="nav"
      aria-label={t('rail.label')}
      align="center"
      gap={2}
      height="100%"
      data-testid="canvas-rail"
      data-rail-view={view}
      style={{
        width: REGION.rail,
        flex: `0 0 ${String(REGION.rail)}px`,
        paddingBlockEnd: 'var(--spacing-4)',
        ...SURFACE,
        borderRight: HAIRLINE,
      }}
    >
      {mark !== undefined && (
        <VStack
          align="center"
          gap={2}
          style={{ width: '100%', flexShrink: 0, paddingBlockStart: 10 }}
        >
          {head ?? (
            <Stack align="center" justify="center" style={ITEM_BOX} data-testid="rail-mark">
              <OnlookMark role="img" aria-label={t(mark.label)} />
            </Stack>
          )}
          <Divider
            data-testid="rail-rule"
            style={{ width: RULE_WIDTH, margin: 0 }}
          />
        </VStack>
      )}

      <ToggleButtonGroup
        label={t('rail.views.label')}
        type="single"
        orientation="vertical"
        size="lg"
        value={view}
        onChange={(next) => {
          // The group reports a press on the ACTIVE toggle as null; the panel always shows one of the two, so that press is a no-op.
          if (next === 'designs' || next === 'artifacts' || next === 'code') onView(next);
        }}
        data-testid="rail-views"
      >
        {views.map((item) => (
          <ViewToggle key={item.id} item={item} isActive={item.view === view} />
        ))}
      </ToggleButtonGroup>

      {hasFoot && foot !== undefined && (
        <Stack align="center" justify="center" style={{ marginBlockStart: 'auto' }}>
          {foot}
        </Stack>
      )}
    </VStack>
  );
}

export function Rail({ head, foot }: Pick<RailViewProps, 'head' | 'foot'>): React.JSX.Element {
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const view = useCanvasStore((state) => state.leftPanelView);
  const setView = useCanvasStore((state) => state.setLeftPanelView);
  return <RailView view={view} onView={setView} codeEnabled={codeEnabled} {...(head ? { head } : {})} {...(foot ? { foot } : {})} />;
}
