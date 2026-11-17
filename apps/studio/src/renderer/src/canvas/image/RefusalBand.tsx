import { Banner } from '@astryxdesign/core/Banner';
import type { CanvasRejectionCode } from '@studio/events';

import { t, type StringKey } from '@studio/i18n';
import type { CanvasRefusalNotice } from '../pages.js';
import { useCanvasStore } from '../store.js';
import {
  IMAGE_GESTURE_MAX_FILES,
  type ImageRefusal,
  type ImageRefusalReason,
} from './ingest.js';

/** The classifier's three plus the gesture's two. */
const REFUSAL_COPY: Record<ImageRefusalReason, StringKey> = {
  'unsupported-format': 'canvas.image.refused.unsupported-format',
  'too-large': 'canvas.image.refused.too-large',
  unreadable: 'canvas.image.refused.unreadable',
  'too-many-files': 'canvas.image.refused.too-many-files',
  'no-image': 'canvas.image.refused.no-image',
};

/** Wide enough for the longest refusal on two lines, narrow enough not to span the canvas. */
const BAND_MAX_WIDTH = 420;

/** A gesture refusal already carries the whole count in its own sentence. */
const NAMES_ONE_FILE: Record<ImageRefusalReason, boolean> = {
  'unsupported-format': true,
  'too-large': true,
  unreadable: true,
  'too-many-files': false,
  'no-image': false,
};

export function ImageRefusalBanner({
  refusal,
  onDismiss,
}: {
  refusal: ImageRefusal;
  onDismiss: () => void;
}): React.JSX.Element {
  const others = NAMES_ONE_FILE[refusal.reason] ? refusal.count - 1 : 0;
  return (
    <Banner
      status="warning"
      elevation="med"
      title={t(REFUSAL_COPY[refusal.reason], {
        name: refusal.name ?? '',
        count: refusal.count,
        limit: IMAGE_GESTURE_MAX_FILES,
      })}
      {...(others > 0
        ? { description: t('canvas.image.refused.others', { count: others }) }
        : {})}
      isDismissable
      onDismiss={onDismiss}
      data-testid="canvas-image-refusal"
      data-refusal-reason={refusal.reason}
    />
  );
}

/** The renderer's own words for each code main sends; main's `reason` is the diagnostic and never reaches a surface (ONL-2488). */
const PAGE_REFUSAL_COPY: Record<CanvasRejectionCode, StringKey> = {
  'last-page': 'canvas.page.refused.last-page',
  'last-non-divider-page': 'canvas.page.refused.last-non-divider-page',
  'page-not-empty': 'canvas.page.refused.page-not-empty',
  'no-such-page': 'canvas.page.refused.no-such-page',
  'divider-page': 'canvas.page.refused.divider-page',
};

function CanvasRefusalBanner({
  refusal,
  onDismiss,
}: {
  refusal: CanvasRefusalNotice;
  onDismiss: () => void;
}): React.JSX.Element {
  return (
    <Banner
      status="warning"
      elevation="med"
      title={t(PAGE_REFUSAL_COPY[refusal.code])}
      isDismissable
      onDismiss={onDismiss}
      data-testid="canvas-page-refusal"
      data-refusal-code={refusal.code}
    />
  );
}

/** A refused page operation, worded here from the typed code: never a silent no-op and never a console line only (ONL-2488). */
export function CanvasRefusalBand(): React.JSX.Element | null {
  const refusal = useCanvasStore((state) => state.canvasRefusal);
  const dismiss = useCanvasStore((state) => state.dismissCanvasRefusal);
  if (refusal === null) return null;
  return (
    <div style={{ maxWidth: BAND_MAX_WIDTH, pointerEvents: 'auto' }}>
      <CanvasRefusalBanner key={refusal.seq} refusal={refusal} onDismiss={dismiss} />
    </div>
  );
}

/** Keyed on `seq`: `Banner` holds its dismissed state internally, so a new refusal has to arrive as a new element or the band stays hidden (ONL-2486). */
export function ImageRefusalBand(): React.JSX.Element | null {
  const refusal = useCanvasStore((state) => state.imageRefusal);
  const dismiss = useCanvasStore((state) => state.dismissImageRefusal);
  if (refusal === null) return null;
  // `Banner` carries `role="alert"` for a warning, so the wrapper is geometry only and takes no name of its own.
  return (
    <div style={{ maxWidth: BAND_MAX_WIDTH, pointerEvents: 'auto' }}>
      <ImageRefusalBanner key={refusal.seq} refusal={refusal} onDismiss={dismiss} />
    </div>
  );
}
