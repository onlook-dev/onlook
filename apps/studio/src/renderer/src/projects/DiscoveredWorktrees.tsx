import { useId, useRef, useState } from 'react';
import type { DiscoveredWorktree } from '@studio/events';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Folder2Icon, ChevronDownIcon } from '../icons/glyphs.js';
import { VStack } from '@astryxdesign/core/Layout';
import { t } from '@studio/i18n';
import { relativeTime } from './relativeTime.js';
import { LAYER } from '../overlay/layers.js';
import './projects.css';

export function discoveredMetaFor(
  candidate: Pick<DiscoveredWorktree, 'groupName' | 'lastEditedAt'>,
  now: number,
): string {
  if (candidate.lastEditedAt === undefined) {
    return t('projects.discovered.meta.undated', { workspace: candidate.groupName });
  }
  const time = relativeTime(candidate.lastEditedAt, now);
  return t('projects.discovered.meta', {
    workspace: candidate.groupName,
    time: t(time.key, time.params),
  });
}

export interface DiscoveredWorktreeItem {
  handle: string;
  name: string;
  meta: string;
  latestCommit?: string;
  onImport: () => void | Promise<void>;
}

export interface DiscoveredWorktreesProps {
  worktrees: DiscoveredWorktreeItem[];
  onImportAll?: () => void;
}

const PANEL = {
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  // `clip`, not `hidden`: a hidden overflow becomes the scroll box and the sticky header would stick to nothing.
  overflow: 'clip',
  flex: '0 0 auto',
} as const;
const HEADER = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
  padding: '4px 4px 4px 12px',
  position: 'sticky',
  top: 0,
  zIndex: LAYER.raised,
  // Opaque, so rows scrolling under it do not show through.
  background: 'linear-gradient(rgba(255,255,255,0.025), rgba(255,255,255,0.025)), var(--studio-ground)',
} as const;
const TOGGLE = {
  appearance: 'none',
  border: 0,
  background: 'none',
  color: 'var(--color-text-primary)',
  font: 'inherit',
  fontSize: 'var(--font-size-base)',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 28,
  cursor: 'pointer',
  padding: 0,
  marginRight: 'auto',
  textAlign: 'left',
} as const;
const ROW = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 36,
  padding: '4px 4px 4px 12px',
  borderTop: 'var(--border-width) solid rgba(255,255,255,0.06)',
} as const;
const NAME = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-base)' } as const;
const META = { ...NAME, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' } as const;
const COMMIT = { ...META, flex: '1 1 0', color: 'var(--color-text-tertiary, var(--color-text-secondary))' } as const;
const DETAILS = {
  display: 'flex',
  flex: '1 1 auto',
  minWidth: 0,
  alignItems: 'baseline',
  flexWrap: 'wrap',
  columnGap: 8,
  rowGap: 0,
} as const;
const IMPORT_ALL = {
  '--color-accent': 'var(--color-background-inverted)',
  paddingBlock: 2,
  fontSize: 14,
  borderRadius: 'var(--radius-element)',
} as React.CSSProperties;
const ACTION = { paddingBlock: 2 } as const;

/** A renderer-only view preference; storage that refuses reads or writes leaves the card open. */
export const DISCOVERED_OPEN_KEY = 'studio.discoveredWorktrees.open';

export function readDiscoveredOpen(): boolean {
  try {
    return window.localStorage.getItem(DISCOVERED_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeDiscoveredOpen(isOpen: boolean): void {
  try {
    window.localStorage.setItem(DISCOVERED_OPEN_KEY, String(isOpen));
  } catch {
    // Unavailable storage keeps the choice for this mount only.
  }
}

export function DiscoveredWorktrees({
  worktrees,
  onImportAll,
}: DiscoveredWorktreesProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(readDiscoveredOpen);
  const [isImporting, setIsImporting] = useState(false);
  const inFlight = useRef(false);
  const listId = useId();

  async function importItems(items: readonly DiscoveredWorktreeItem[]): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsImporting(true);
    try {
      for (const item of items) await item.onImport();
    } finally {
      inFlight.current = false;
      setIsImporting(false);
    }
  }

  if (worktrees.length === 0) return null;

  return (
    <VStack style={PANEL} data-testid="discovered-worktrees" aria-busy={isImporting}>
      <div style={HEADER}>
        <button
          type="button"
          style={TOGGLE}
          aria-expanded={isOpen}
          aria-controls={listId}
          onClick={() => {
            const next = !isOpen;
            writeDiscoveredOpen(next);
            setIsOpen(next);
          }}
          data-testid="discovered-worktrees-toggle"
        >
          {worktrees.length === 1
            ? t('projects.discovered.lead.one')
            : t('projects.discovered.lead.many', { count: String(worktrees.length) })}
          <span data-discovered-chevron style={{ display: 'flex', flex: '0 0 auto', transform: isOpen ? 'rotate(180deg)' : undefined }}>
            <Icon icon={ChevronDownIcon} size="sm" />
          </span>
        </button>
        <Button
          variant="primary"
          size="sm"
          style={IMPORT_ALL}
          label={t('projects.discovered.importAll')}
          isDisabled={isImporting}
          onClick={() => {
            if (inFlight.current) return;
            onImportAll?.();
            void importItems(worktrees);
          }}
          data-testid="discovered-worktrees-import-all"
        />
      </div>
      <div id={listId} hidden={!isOpen}>
        {worktrees.map((worktree) => (
          <div key={worktree.handle} style={ROW} data-testid="discovered-worktree-row" data-worktree-path={worktree.handle}>
            <span aria-hidden="true" style={{ display: 'flex', color: 'var(--color-text-secondary)', flex: '0 0 auto' }}>
              <Icon icon={Folder2Icon} size="sm" />
            </span>
            <div style={DETAILS}>
              <span style={NAME} title={worktree.name}>{worktree.name}</span>
              <span style={META} title={worktree.meta}>{worktree.meta}</span>
              {worktree.latestCommit !== undefined && (
                <span style={COMMIT} title={worktree.latestCommit} data-testid="discovered-worktree-commit">
                  {worktree.latestCommit}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              style={ACTION}
              label={t('projects.discovered.import')}
              isDisabled={isImporting}
              onClick={() => { void importItems([worktree]); }}
              data-testid="discovered-worktree-import"
            />
          </div>
        ))}
      </div>
    </VStack>
  );
}
