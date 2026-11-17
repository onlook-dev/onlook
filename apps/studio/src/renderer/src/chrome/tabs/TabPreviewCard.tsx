import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { WINDOW_BAR_HEIGHT, type TabPreview } from '@studio/events';

import { GitStatusPill } from '@studio/git-ui';
import { GIT_PILL_GLYPHS, GIT_STATUS_STRINGS } from '../../git-status/presentation.js';
import { t } from '@studio/i18n';
import { PILL_OVERLAY } from '../../projects/ProjectCard.js';
import { gitCardPropsFor } from '../../projects/gitCardProps.js';
import { relativeTime } from '../../projects/relativeTime.js';
import { useChromeExpansion } from '../expansion.js';
import { LAYER } from '../../overlay/layers.js';

const PREVIEW_CARD_WIDTH = 240;
const CARD_GAP = 4;
const CARD_PADDING = 6;
const EDGE_INSET = 8;
/** The thumbnail's stored ratio, so a capture letterboxes rather than crops. */
const IMAGE_RATIO = 273 / 140;
const IMAGE_HEIGHT = Math.round((PREVIEW_CARD_WIDTH - 2 * CARD_PADDING) / IMAGE_RATIO);
/** Card, gap and the shadow's reach below it. */
export const PREVIEW_EXTENT_HEIGHT = WINDOW_BAR_HEIGHT + CARD_GAP + IMAGE_HEIGHT + 2 * CARD_PADDING + 64;

const CARD: CSSProperties = {
  backgroundColor: 'var(--color-background-surface)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  position: 'fixed',
  top: WINDOW_BAR_HEIGHT + CARD_GAP,
  width: PREVIEW_CARD_WIDTH,
  boxSizing: 'border-box',
  padding: CARD_PADDING,
  border: '0.5px solid var(--color-border)',
  boxShadow: 'var(--shadow-med)',
  borderRadius: 'var(--radius-container)',
  pointerEvents: 'none',
  zIndex: LAYER.card,
};

const IMAGE_BOX: CSSProperties = {
  position: 'relative',
  height: IMAGE_HEIGHT,
  borderRadius: 'var(--radius-element)',
  backgroundColor: 'var(--color-background-muted)',
  overflow: 'hidden',
};

const IMAGE: CSSProperties = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };

/* Tighter than a Projects card's 12: the preview's image well is smaller. */
const PREVIEW_PILL_OVERLAY = { ...PILL_OVERLAY, top: '8px', left: '8px' } as const;

const LINE: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function editedLine(editedAt: string | undefined, now: number): string | undefined {
  if (editedAt === undefined) return undefined;
  const time = relativeTime(editedAt, now);
  if (time.key === 'projects.time.unknown') return undefined;
  if (time.key === 'projects.time.justNow') return t('tabs.preview.editedJustNow');
  return t('tabs.preview.edited', { when: t(time.key, time.params) });
}

export function previewCardLeft(tabLeft: number, viewportWidth: number): number {
  return Math.max(EDGE_INSET, Math.min(tabLeft, viewportWidth - PREVIEW_CARD_WIDTH - EDGE_INSET));
}

export interface TabPreviewCardProps {
  name: string;
  preview: TabPreview;
  left: number;
  top?: number;
  now: number;
}

export function TabPreviewCard({ name, preview, left, top = WINDOW_BAR_HEIGHT + CARD_GAP, now }: TabPreviewCardProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const expansion = useChromeExpansion();
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (card === null) return;
    const measure = (): void => {
      void expansion.claim({ kind: 'strip', height: Math.ceil(card.getBoundingClientRect().bottom) + EDGE_INSET });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [expansion, top]);
  const status = editedLine(preview.editedAt, now);
  const [failedSrc, setFailedSrc] = useState<string>();
  const gitPill = preview.git === undefined ? undefined : gitCardPropsFor(preview.git.row, preview.git.defaults, false).gitPill;
  const src = preview.previewUrl !== undefined && preview.previewUrl !== failedSrc ? preview.previewUrl : undefined;
  return (
    <div ref={cardRef} role="presentation" data-testid="tab-preview-card" style={{ ...CARD, left, top }}>
      <div style={IMAGE_BOX} data-testid="tab-preview-image">
        {src === undefined ? null : (
          <img src={src} alt="" decoding="async" onError={() => setFailedSrc(src)} style={IMAGE} />
        )}
        {gitPill === undefined ? null : (
          <span aria-hidden="true" className="tab-preview-pill" style={PREVIEW_PILL_OVERLAY}>
            <GitStatusPill state={gitPill} strings={GIT_STATUS_STRINGS} glyphs={GIT_PILL_GLYPHS} scale="card" testId="tab-preview-git-pill" />
          </span>
        )}
      </div>
      <div style={{ paddingInline: 4, paddingBlock: '8px 2px' }}>
        <Text type="supporting" weight="medium" color="primary" style={{ display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
          {name}
        </Text>
        {status === undefined ? null : (
          <Text type="supporting" color="secondary" style={LINE}>
            {status}
          </Text>
        )}
      </div>
    </div>
  );
}
