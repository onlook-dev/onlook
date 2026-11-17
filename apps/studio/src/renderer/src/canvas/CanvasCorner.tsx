import { useEffect } from 'react';
import { IconButton } from '@astryxdesign/core/IconButton';

import { t } from '@studio/i18n';
import { HelpIcon } from '../icons/glyphs.js';
import { useHelpMenu } from '../rail/helpMenuRows.js';
import type { PanelCover } from './panelCover.js';
import { REGION } from '../layout.js';
import { isChromeHidden, isRailHidden, useCanvasStore } from './store.js';
import {
  CORNER_GUTTER,
  CORNER_YIELDS_BELOW,
  helpButtonVisible,
  tipsPillPlacement,
  tipsPillVisible,
} from './cornerPlacement.js';
import { remeasureFootClaims, useToastFootClaim } from '../notifications/foot.js';
import { TipsButton } from '../tips/TipsButton.js';
import { useFlag } from '../flags/store.js';
import { useFootHoldsPill, useInspireTipShown } from '../sidebar/footSeat.js';
import { useLeftPanelFootStore } from '../sidebar/footStore.js';
import { LAYER } from '../overlay/layers.js';

const YIELD_HREF = 'studio-canvas-corner-yield';
const YIELD_RULES = `
.canvas-corner { container-type: inline-size; }
@container (max-width: ${String(CORNER_YIELDS_BELOW - 1)}px) {
  /* \`!important\`: the seat carries its own inline \`display\`, which a stylesheet rule otherwise loses to. */
  .canvas-corner-pill { display: none !important; }
}
`;

/** The canvas's lower-left corner: the guide's invitation, and help when the rail is not there to carry it (ONL-2350, ONL-2563). */
export function CanvasCorner({ cover }: { cover: PanelCover }): React.JSX.Element | null {
  const isInteract = useCanvasStore((state) => state.mode) === 'interact';
  const chromeHidden = useCanvasStore(isChromeHidden);
  const isLeftPanelHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  const isTipShown = useInspireTipShown();
  const corner = { chromeHidden, isInteract, isLeftPanelHidden };
  const panelFootPx = useLeftPanelFootStore((state) => state.footPx);
  /* The pill only: the help button and an unlifted pill both sit inside the `--size-element-lg` floor `TOAST_LANE_BOTTOM` already keeps (ONL-3182). */
  const claimFoot = useToastFootClaim();
  /* The lift moves the pill without resizing it, so its own observer stays quiet (ONL-3182). */
  useEffect(remeasureFootClaims, [panelFootPx]);

  const showsHelp = helpButtonVisible(corner);
  const isTipsPillHidden = useFlag('rail-foot');
  const isPillInFoot = useFootHoldsPill();
  const showsPill = !isPillInFoot && tipsPillVisible({ ...corner, isInspireTipShown: isTipShown, isTipsPillHidden });
  if (!showsHelp && !showsPill) return null;

  const { onPanel, ...placement } = tipsPillPlacement(corner, panelFootPx);
  const pill = showsPill ? (
    <TipsButton ref={claimFoot} {...(onPanel ? {} : { className: 'canvas-corner-pill' })} {...placement} />
  ) : null;

  if (onPanel) {
    return (
      <div
        style={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: REGION.rail,
          width: cover.start - REGION.rail,
          zIndex: LAYER.raised,
          pointerEvents: 'none',
        }}
      >
        {pill}
      </div>
    );
  }

  return (
    <div
      className="canvas-corner"
      style={{
        position: 'absolute',
        insetBlock: 0,
        insetInlineEnd: cover.end,
        insetInlineStart: cover.start,
        zIndex: LAYER.raised,
        pointerEvents: 'none',
      }}
    >
      <style href={YIELD_HREF} precedence="medium">
        {YIELD_RULES}
      </style>
      {showsHelp ? <CornerHelp /> : null}
      {/* Yields the row to the tool bar on a canvas too narrow for both: an
          invitation sitting on the Select tool is worse than no invitation. */}
      {pill}
    </div>
  );
}

function CornerHelp(): React.JSX.Element {
  const menu = useHelpMenu('above');
  return (
    <>
      <IconButton
        ref={menu.triggerRef}
        variant="secondary"
        size="lg"
        label={t('canvas.help')}
        tooltip={t('canvas.help')}
        icon={<HelpIcon />}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        data-testid="canvas-help"
        style={{
          position: 'absolute',
          insetInlineStart: CORNER_GUTTER,
          bottom: CORNER_GUTTER,
          pointerEvents: 'auto',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-med)',
        }}
        onClick={menu.toggle}
        onKeyDown={menu.onTriggerKeyDown}
      />
      {menu.render(menu.rows)}
    </>
  );
}
