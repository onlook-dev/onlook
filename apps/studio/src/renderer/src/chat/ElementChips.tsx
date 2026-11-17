import { Icon } from '@astryxdesign/core/Icon';
import { AttachmentPill } from '@studio/chat-ui';
import type { ElementSelection } from '../canvas/selection.js';
import { useCanvasStore } from '../canvas/store.js';
import { ElementSelectionIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { RemovableGlyphButton } from './RemovableGlyphButton.jsx';

/** The resting glyph's own box, so the locked chip keeps the button's footprint. */
const LOCKED_GLYPH = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--spacing-4)',
  height: 'var(--spacing-4)',
} as const;

function ElementChip({
  selection,
  isLocked,
  onRemove,
}: {
  selection: ElementSelection;
  /** The open bubble's anchor: the press this control would make is refused, so the control does not ship (ONL-2455). */
  isLocked: boolean;
  onRemove: (id: string) => void;
}): React.JSX.Element {
  const { evidence, stale } = selection;

  return (
    <AttachmentPill
      state="unsubmitted"
      label={evidence.tag}
      labelTitle={stale ? t('chat.element.staleHint') : evidence.domPath}
      ariaLabel={stale ? t('chat.element.staleLabel', { tag: evidence.tag }) : undefined}
      testId="chat-element-chip"
      isStale={stale}
      maxWidth={180}
      leading={
        isLocked ? (
          <span style={LOCKED_GLYPH}>
            <Icon icon={ElementSelectionIcon} size="xsm" color="inherit" />
          </span>
        ) : (
          <RemovableGlyphButton
            label={t('chat.element.remove', { tag: evidence.tag })}
            restingGlyph={ElementSelectionIcon}
            onActivate={() => onRemove(evidence.id)}
            testId="chat-element-remove"
          />
        )
      }
      style={{
        // A stale selection still sends its evidence; dimmed, not an error.
        opacity: stale ? 0.55 : 1,
        outline: stale ? 'var(--border-width) solid var(--color-border)' : 'none',
      }}
    />
  );
}

export function ElementChips({
  selections,
  onRemove,
}: {
  selections: ElementSelection[];
  onRemove: (id: string) => void;
}): React.JSX.Element {
  // Read here, not taken as a prop: the composer's attachment strip that renders the anchor's chip is outside the bubble's subtree (ONL-2455).
  const anchorId = useCanvasStore((state) => state.inlineChat?.anchorId ?? null);
  return (
    <>
      {selections.map((selection) => (
        <ElementChip
          key={selection.evidence.id}
          selection={selection}
          isLocked={selection.evidence.id === anchorId}
          onRemove={onRemove}
        />
      ))}
    </>
  );
}
