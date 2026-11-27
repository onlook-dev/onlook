import { useState } from 'react';
import { AttachmentPill, ImagePreview } from '@studio/chat-ui';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import type { AttachmentDraft } from '../attachments.js';
import { CloseIcon, TextGlyph, FileGlyph } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { formatFileSize } from './fileSize.js';

function AttachmentChip({
  draft,
  onRemove,
}: {
  draft: AttachmentDraft;
  onRemove: (id: string) => void;
}): React.JSX.Element {
  const [isActive, setActive] = useState(false);

  return (
    <ImagePreview
      url={draft.previewUrl}
      alt={t('chat.attach.preview', { name: draft.name })}
      unavailableLabel={t('chat.image.unavailable')}
    >
      <span
        style={{ display: 'inline-flex' }}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setActive(false);
          }
        }}
        data-testid="chat-attachment-chip"
      >
        <AttachmentPill
          state="unsubmitted"
          label={draft.name}
          labelTitle={`${draft.name}${draft.ref.originalSize === undefined ? '' : ` · ${formatFileSize(draft.ref.originalSize)}`}`}
          flushLeading
          maxWidth={180}
          leading={
            <IconButton
              label={t('chat.attach.remove', { name: draft.name })}
              icon={
                isActive ? (
                  <Icon icon={CloseIcon} size="sm" color="inherit" />
                ) : 'kind' in draft.ref ? (
                  <Icon icon={draft.ref.mediaType === 'application/pdf' ? FileGlyph : TextGlyph} size="sm" color="inherit" />
                ) : (
                  <img
                    src={draft.previewUrl}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: 'var(--studio-attachment-pill-height)',
                      height: 'var(--studio-attachment-pill-height)',
                      objectFit: 'cover',
                    }}
                  />
                )
              }
              variant="ghost"
              size="sm"
              // No focus on press: in the inline bubble it would leave the editable, and the canvas clipboard seat stops yielding to it (ONL-2549).
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => onRemove(draft.ref.id)}
              style={{
                width: 'var(--studio-attachment-pill-height)',
                height: 'var(--studio-attachment-pill-height)',
                minWidth: 'var(--studio-attachment-pill-height)',
                padding: 0,
                overflow: 'hidden',
              }}
              data-testid="chat-attachment-remove"
            />
          }
        />
      </span>
    </ImagePreview>
  );
}

export function AttachmentChips({
  drafts,
  onRemove,
}: {
  drafts: AttachmentDraft[];
  onRemove: (id: string) => void;
}): React.JSX.Element {
  return (
    <>
      {drafts.map((draft) => (
        <AttachmentChip key={draft.ref.id} draft={draft} onRemove={onRemove} />
      ))}
    </>
  );
}
