import { useState } from 'react';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { GitCardStatus, GitStatusPill, prOf, type GitCardStateId, type GitPillState } from '@studio/git-ui';
import { GIT_PILL_GLYPHS, GIT_STATUS_STRINGS, cardGlyphFor } from '../git-status/presentation.js';
import { t } from '@studio/i18n';
import { MoreIcon } from '../icons/glyphs.js';
import { REPLAY_BLOCK_ATTRIBUTE } from '../replay/derive.js';
import { RenameField } from '../RenameField.js';
import './projects.css';

/* Only the thumbnail ratio below comes from this; the card itself stays fluid
   (`gridTrack.ts` has why re-pinning its width is wrong). */
export const PROJECT_CARD_WIDTH = 273;

const THUMBNAIL_RATIO = PROJECT_CARD_WIDTH / 140;

const CHIP_INSET = '10px';

export const PILL_OVERLAY = {
  position: 'absolute',
  top: '12px',
  left: '12px',
  pointerEvents: 'none',
} as const;

const CARD = {
  position: 'relative',
  /* The grid's own `minmax(0, 1fr)` already zeroes this, but a card in any other
     container is pushed wider by a long name without it. */
  minWidth: 0,
  backgroundColor: 'var(--color-background-gray)',
  borderRadius: 'var(--radius-container)',
} as const;

const CARD_HOVERED = {
  backgroundImage:
    'linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed))',
} as const;

const THUMBNAIL_PLACEHOLDER = {
  backgroundColor: 'var(--color-background-muted)',
  width: '100%',
  height: '100%',
} as const;

/* On the ratio BOX so the stored image's transparent margin has a ground under it — never a
   sibling: the core reset sizes every direct child of the ratio wrapper, which then covers it. */
const THUMBNAIL_GROUND = {
  backgroundColor: 'var(--color-background-muted)',
} as const;

const THUMBNAIL_CLASS = 'project-card-thumbnail';

const THUMBNAIL_IMAGE = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
} as const;

/* Without `minWidth: 0` the flex child refuses to shrink and an unbounded
   project name pushes the card out of its grid column instead of truncating. */
const BODY = { minWidth: 0 } as const;

const NAME = {
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

/* Tracks what `Text type="body"` renders as, so the rename field sits in the
   name's exact metrics and nothing shifts on entry. */
const NAME_FIELD_FONT = { fontSize: 'var(--font-size-base)' } as const;

/* The openable region is its own button and the `⋯` chip is its SIBLING — the
   chip is a `<button>`, so the card cannot become one around it. */
const OPEN_TARGET = {
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  width: '100%',
  minWidth: 0,
  cursor: 'pointer',
  borderRadius: 'inherit',
  overflow: 'hidden',
} as const;

/* Not `opacity`: that dims the sentence carrying the new information too, and
   landed at 2.5:1 (ONL-1908). */
const MISSING = { backgroundColor: 'var(--color-background-muted)', cursor: 'default' } as const;

const CHIP = {
  position: 'absolute',
  top: CHIP_INSET,
  right: CHIP_INSET,
  appearance: 'none',
  border: 'none',
  margin: 0,
  font: 'inherit',
  cursor: 'pointer',
  backgroundColor: 'var(--color-overlay-pressed)',
  borderRadius: 'var(--radius-element)',
} as const;

export interface ProjectCardProps {
  name: string;
  meta: string;
  previewSrc?: string;
  showMenu?: boolean;
  isHovered?: boolean;
  onMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  onOpen?: () => void;
  isMissing?: boolean;
  /** Recedes like `isMissing` but stays OPENABLE — archive is a shelf, not a lock. */
  isArchived?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameCommit?: (name: string) => void;
  onRenameCancel?: () => void;
  gitState?: GitCardStateId;
  gitPill?: GitPillState;
}

/** The fade belongs to the URL that LOADED — `loading="lazy"` means mount and paint are no
 * longer the same moment, and a re-render with the same URL must not replay it. */
export function thumbnailFadeFor(previewSrc: string, loadedSrc: string | undefined): 'true' | undefined {
  return loadedSrc === previewSrc ? 'true' : undefined;
}

export function openLabelFor(name: string, gitState: GitCardStateId, gitPill: GitPillState | undefined): string {
  const statusLabel = gitState === 'none' ? undefined : GIT_STATUS_STRINGS.cardLabel[gitState];
  const pr = gitPill === undefined ? undefined : prOf(gitPill);
  return [name, statusLabel, pr === undefined ? undefined : `#${pr.number}`]
    .filter((part) => part !== undefined)
    .join(', ');
}

export function ProjectCard({
  name,
  meta,
  previewSrc,
  showMenu = false,
  isHovered = false,
  onMenu,
  onOpen,
  isMissing = false,
  isArchived = false,
  isRenaming = false,
  renameValue,
  onRenameCommit,
  onRenameCancel,
  gitState = 'none',
  gitPill,
}: ProjectCardProps): React.JSX.Element {
  const isOpenable = onOpen !== undefined && !isMissing && !isRenaming;

  const [loadedSrc, setLoadedSrc] = useState<string>();

  const openLabel = openLabelFor(name, gitState, gitPill);

  // MISSING's card fill is the thumbnail placeholder's own token, so archived recedes in the ink instead.
  const dimInk = isArchived && !isMissing;

  return (
    <VStack
      style={{
        ...(isMissing ? { ...CARD, ...MISSING } : CARD),
        ...(isHovered && !isMissing ? CARD_HOVERED : undefined),
      }}
    >
      {/* While renaming the wrapper stops being a button, so placing the caret
          in the field cannot open the project. */}
      <VStack
        as={isRenaming ? 'div' : 'button'}
        aria-label={isRenaming ? undefined : openLabel}
        aria-disabled={isOpenable || isRenaming ? undefined : true}
        {...(isOpenable ? { onClick: onOpen } : {})}
        data-testid="project-card-open"
        style={isOpenable ? OPEN_TARGET : { ...OPEN_TARGET, cursor: 'default' }}
      >
        <AspectRatio ratio={THUMBNAIL_RATIO} fit="cover" style={THUMBNAIL_GROUND}>
          {previewSrc ? (
            /* `alt=""`: the card's name is already the image's label. */
            <img
              src={previewSrc}
              alt=""
              className={THUMBNAIL_CLASS}
              data-testid="project-card-thumbnail"
              {...{ [REPLAY_BLOCK_ATTRIBUTE]: '' }}
              data-loaded={thumbnailFadeFor(previewSrc, loadedSrc)}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoadedSrc(previewSrc)}
              style={THUMBNAIL_IMAGE}
            />
          ) : (
            <div
              style={THUMBNAIL_PLACEHOLDER}
              data-testid="project-card-placeholder"
            />
          )}
        </AspectRatio>

        <VStack padding={3} gap={0.5} style={BODY}>
          {isRenaming ? (
            <RenameField
              initialValue={renameValue ?? name}
              label={t('projects.rename.field')}
              testId="project-rename-input"
              style={NAME_FIELD_FONT}
              {...(onRenameCommit ? { onCommit: onRenameCommit } : {})}
              {...(onRenameCancel ? { onCancel: onRenameCancel } : {})}
            />
          ) : (
            <Text type="body" color={dimInk ? 'secondary' : 'primary'} style={NAME}>
              {name}
            </Text>
          )}
          <GitCardStatus age={meta} state={gitState} strings={GIT_STATUS_STRINGS} glyph={cardGlyphFor(gitState)} isDim={dimInk} />
        </VStack>
      </VStack>

      {gitPill !== undefined ? (
        <Stack as="span" aria-hidden="true" style={PILL_OVERLAY}>
          <GitStatusPill state={gitPill} strings={GIT_STATUS_STRINGS} glyphs={GIT_PILL_GLYPHS} scale="card" testId="project-card-git-pill" />
        </Stack>
      ) : null}

      {showMenu ? (
        <Stack
          as="button"
          aria-label={t('projects.card.menu')}
          data-testid="project-card-menu"
          onClick={onMenu}
          align="center"
          justify="center"
          padding={1}
          style={CHIP}
        >
          <Icon icon={MoreIcon} size="md" color="primary" />
        </Stack>
      ) : null}
    </VStack>
  );
}
