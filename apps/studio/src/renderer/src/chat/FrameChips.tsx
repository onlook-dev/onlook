import { AttachmentPill } from '@studio/chat-ui';
import { ARTIFACT_ACCENT_ATTRS } from '../canvas/artifactAccent.js';
import type { SelectedObject } from '../canvas/selection.js';
import { ImageGlyph, PlaygroundGlyph, SectionGlyph, TextGlyph, WindowGlyph } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { RemovableGlyphButton } from './RemovableGlyphButton.jsx';

const SCOPE = { display: 'contents' } as const;

function Pill({
  object,
  label,
  glyph,
  removeLabel,
  testId,
  removeTestId,
  onRemove,
}: {
  object: SelectedObject;
  label: string;
  glyph: React.ComponentProps<typeof RemovableGlyphButton>['restingGlyph'];
  removeLabel: string;
  testId: string;
  removeTestId: string;
  onRemove: (id: string) => void;
}): React.JSX.Element {
  return (
    <AttachmentPill
      state="unsubmitted"
      tone="accent"
      label={label}
      labelTitle={label}
      testId={testId}
      maxWidth={180}
      leading={
        <RemovableGlyphButton
          label={removeLabel}
          restingGlyph={glyph}
          onActivate={() => onRemove(object.id)}
          testId={removeTestId}
        />
      }
    />
  );
}

function FrameChip({
  object,
  onRemove,
}: {
  object: SelectedObject;
  onRemove: (id: string) => void;
}): React.JSX.Element {
  const label = object.label;

  return (
    <span style={SCOPE}>
      <Pill
        object={object}
        label={label}
        glyph={WindowGlyph}
        removeLabel={t('chat.frame.remove', { name: label })}
        testId="chat-frame-chip"
        removeTestId="chat-frame-remove"
        onRemove={onRemove}
      />
    </span>
  );
}

const OBJECT_CHIP: Readonly<
  Record<'text' | 'image' | 'artifact' | 'section', { glyph: typeof TextGlyph; testId: string }>
> = {
  text: { glyph: TextGlyph, testId: 'chat-text' },
  image: { glyph: ImageGlyph, testId: 'chat-image' },
  artifact: { glyph: PlaygroundGlyph, testId: 'chat-artifact' },
  section: { glyph: SectionGlyph, testId: 'chat-section' },
};

/** A text object and a picture chip the same way; only the picture also rides the prompt as bytes (ONL-2486). */
function ObjectChip({
  object,
  onRemove,
}: {
  object: SelectedObject;
  onRemove: (id: string) => void;
}): React.JSX.Element {
  const label = object.label;
  const shape = OBJECT_CHIP[object.kind === 'browser' ? 'image' : object.kind];

  return (
    <span {...(object.kind === 'artifact' ? ARTIFACT_ACCENT_ATTRS : {})} style={SCOPE}>
      <Pill
        object={object}
        label={label}
        glyph={shape.glyph}
        removeLabel={t('chat.attach.remove', { name: label })}
        testId={`${shape.testId}-chip`}
        removeTestId={`${shape.testId}-remove`}
        onRemove={onRemove}
      />
    </span>
  );
}

export function FrameChips({
  objects,
  onRemove,
}: {
  objects: SelectedObject[];
  onRemove: (id: string) => void;
}): React.JSX.Element {
  return (
    <>
      {objects.map((object) =>
        object.kind === 'browser' ? (
          <FrameChip key={object.id} object={object} onRemove={onRemove} />
        ) : (
          <ObjectChip key={object.id} object={object} onRemove={onRemove} />
        ),
      )}
    </>
  );
}
