import { useEffect, useState, type ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import type { ElementEvidence, FrameAttachment, ImageRef, PromptAttachment, SkillAttachment } from '@studio/events';
import { artifactTitleLabels } from '@studio/events';
import { AttachmentPill } from './AttachmentPill.js';

import { ImagePreview } from './ImagePreview.js';
import type { ResolveImage } from './ImageThumbnail.js';

export function isSkillAttachment(attachment: PromptAttachment): attachment is SkillAttachment {
  return 'kind' in attachment && attachment.kind === 'skill';
}

/** The shelf is for things with a pill; a skill is part of the prompt line instead (ONL-2047). */
export function isShelfAttachment(attachment: PromptAttachment): attachment is Exclude<PromptAttachment, SkillAttachment> {
  return !isSkillAttachment(attachment);
}

function isSubmittedElement(attachment: PromptAttachment): attachment is ElementEvidence {
  return 'kind' in attachment && attachment.kind === 'element';
}

function isSubmittedFrame(attachment: PromptAttachment): attachment is FrameAttachment {
  return 'kind' in attachment && attachment.kind === 'frame';
}

// Frames carry no id, and two can share a name.
function nextFrameKey(seen: Map<string, number>, name: string): string {
  const occurrence = seen.get(name) ?? 0;
  seen.set(name, occurrence + 1);
  return occurrence === 0 ? `frame-${name}` : `frame-${name}-${String(occurrence)}`;
}

// CSS, not the window glyph: that family is licensed to the app and cannot live here.
function FrameMarker(): React.JSX.Element {
  return (
    <HStack
      aria-hidden="true"
      style={{
        display: 'block',
        width: 'var(--studio-submitted-attachment-marker-size)',
        height: 'var(--studio-submitted-attachment-marker-size)',
        boxSizing: 'border-box',
        border: 'var(--border-width) solid currentColor',
        borderRadius: '2px',
        borderTopWidth: '3px',
      }}
    />
  );
}

function SubmittedImage({
  image,
  resolve,
  label,
  alt,
  unavailableLabel,
}: {
  image: ImageRef;
  resolve?: ResolveImage;
  label: string;
  alt: string;
  unavailableLabel: string;
}): React.JSX.Element {
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    if (resolve) {
      void resolve(image).then((resolved) => {
        if (alive) setUrl(resolved);
      });
    }
    return () => {
      alive = false;
    };
  }, [image, resolve]);

  return (
    <ImagePreview url={url} alt={alt} unavailableLabel={unavailableLabel}>
      <AttachmentPill
        state="submitted"
        label={label}
        testId="chat-submitted-attachment-pill"
        flushLeading
        leading={
          <HStack
            width="var(--studio-attachment-pill-height)"
            height="var(--studio-attachment-pill-height)"
            aria-hidden={url ? undefined : true}
            style={{
              flex: '0 0 auto',
              overflow: 'hidden',
              background: 'var(--color-background-card)',
            }}
          >
            {url ? (
              <img
                src={url}
                alt={alt}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
          </HStack>
        }
      />
    </ImagePreview>
  );
}

export function SubmittedAttachments({
  attachments,
  resolveImage,
  imageLabel,
  imageAlt,
  imageUnavailable,
  sizeLabel,
  onFrameActivate,
  onFrameHover,
  isFrameArtifact,
  artifactGlyph,
  textGlyph,
  fileGlyph,
  onArtifactActivate,
  wrapArtifact,
}: {
  /** A skill may arrive here, but the bubble renders it as a token in the prompt line (ONL-2047). */
  attachments: PromptAttachment[];
  resolveImage?: ResolveImage;
  imageLabel: string;
  imageAlt: string;
  imageUnavailable: string;
  sizeLabel?: (bytes: number) => string;
  onFrameActivate?: (name: string) => void;
  onFrameHover?: (name: string, isHovered: boolean) => void;
  isFrameArtifact?: (name: string) => boolean;
  artifactGlyph?: ReactNode;
  textGlyph?: ReactNode;
  fileGlyph?: ReactNode;
  /** Centres the canvas on the artifact; answers whether it could. */
  onArtifactActivate?: (artifactId: string, pagePath: string | undefined) => boolean;
  /** Wraps an artifact pill, for a hover preview the app renders. */
  wrapArtifact?: (attachment: { artifactId: string; pagePath?: string; title: string }, pill: ReactNode) => ReactNode;
}): React.JSX.Element {
  const seenFrameNames = new Map<string, number>();
  const artifactLabels = artifactTitleLabels(attachments.flatMap((attachment) =>
    'kind' in attachment && attachment.kind === 'artifact' ? [{ id: attachment.artifactId, title: attachment.title }] : [],
  ));
  return (
    <HStack
      gap={1}
      data-testid="chat-submitted-attachments"
      onWheel={(event) => {
        // A mouse wheel has no sideways axis; a trackpad's own sideways swipe passes through.
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.currentTarget.scrollLeft += event.deltaY;
      }}
      style={{
        position: 'relative',
        // Fills the bubble, not a fixed width.
        width: '100%',
        maxWidth: 'calc(100% + var(--spacing-2))',
        height: 'var(--studio-attachment-pill-height)',
        // The host keeps its own controls' seat free at the row's end, so the
        // last chip comes to rest short of them.
        paddingInlineEnd: 'var(--studio-submitted-attachments-reserve, 0px)',
        // One row that scrolls sideways when the chips outrun the bubble
        // (ONL-2593), and passes under the message's own actions rather than
        // wrapping away from them.
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        scrollbarWidth: 'none',
        // Chips are objects, not prose: a drag across the bubble selects the message text only (ONL-2593).
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {attachments.filter(isShelfAttachment).map((attachment) =>
        'kind' in attachment && attachment.kind === 'file' ? (
          <AttachmentPill key={attachment.id} state="submitted" label={attachment.name} labelTitle={`${attachment.name} · ${sizeLabel?.(attachment.originalSize) ?? String(attachment.originalSize)}`} testId="chat-submitted-file-pill" leading={(attachment.mediaType === 'application/pdf' ? fileGlyph : textGlyph) ?? <FrameMarker />} />
        ) : 'kind' in attachment && attachment.kind === 'artifact' ? (
          <span key={`artifact-${attachment.artifactId}-${attachment.pagePath ?? ''}`} data-accent="artifact" style={{ display: 'inline-flex', flex: 'none' }}>
            {(() => {
              // No id tooltip: a raw id names nothing to a designer; the app's preview stands in for it (ONL-2593).
              const pill = (
                <AttachmentPill
                  state="submitted"
                  tone="accent"
                  label={artifactLabels.get(attachment.artifactId) ?? attachment.title}
                  testId="chat-submitted-artifact-pill"
                  leading={artifactGlyph ?? <FrameMarker />}
                />
              );
              // A wrapper, not the pill's own button mode: that resizes its label and glyph (ONL-2593).
              const clickable = onArtifactActivate === undefined ? pill : (
                <span
                  role="button"
                  tabIndex={0}
                  style={{ display: 'inline-flex', flex: 'none', cursor: 'pointer' }}
                  onClick={(event) => { event.stopPropagation(); onArtifactActivate(attachment.artifactId, attachment.pagePath); }}
                  onKeyDown={(event) => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); event.stopPropagation(); onArtifactActivate(attachment.artifactId, attachment.pagePath); }}
                >
                  {pill}
                </span>
              );
              return wrapArtifact ? wrapArtifact(attachment, clickable) : clickable;
            })()}
          </span>
        ) : isSubmittedFrame(attachment) ? (
          // `contents`: the accent scope re-points the pill's colours without adding a box to the row.
          <span
            key={nextFrameKey(seenFrameNames, attachment.name)}
            {...(isFrameArtifact?.(attachment.name) ? { 'data-accent': 'artifact' } : {})}
            style={{ display: 'contents' }}
          >
          <AttachmentPill
            state="submitted"
            tone="accent"
            label={attachment.name}
            testId="chat-submitted-frame-pill"
            leading={
              attachment.object === 'text' && textGlyph
                ? textGlyph
                : isFrameArtifact?.(attachment.name) && artifactGlyph
                  ? artifactGlyph
                  : <FrameMarker />
            }
            {...(onFrameHover
              ? {
                  onHoverChange: (isHovered: boolean) => {
                    onFrameHover(attachment.name, isHovered);
                  },
                }
              : {})}
            {...(onFrameActivate
              ? {
                  onActivate: () => {
                    onFrameActivate(attachment.name);
                  },
                }
              : {})}
          />
          </span>
        ) : isSubmittedElement(attachment) ? (
          <AttachmentPill
            key={attachment.id}
            state="submitted"
            label={attachment.tag}
            testId="chat-submitted-attachment-pill"
            leading={
              <HStack
                aria-hidden="true"
                style={{
                  display: 'block',
                  width: 'var(--studio-submitted-attachment-marker-size)',
                  height: 'var(--studio-submitted-attachment-marker-size)',
                  boxSizing: 'border-box',
                  border: 'var(--border-width) solid currentColor',
                }}
              />
            }
          />
        ) : (
          <SubmittedImage
            key={attachment.id}
            image={attachment}
            resolve={resolveImage}
            // The composer named this image; an older row carries no name and keeps the generic one (ONL-2549).
            label={attachment.name ?? imageLabel}
            alt={imageAlt}
            unavailableLabel={imageUnavailable}
          />
        ),
      )}
      <HStack
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetBlock: 0,
          right: 0,
          width: 'var(--spacing-12)',
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent, var(--studio-submitted-attachments-fade, var(--color-background-muted)))',
        }}
      />
    </HStack>
  );
}
