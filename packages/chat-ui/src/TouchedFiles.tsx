import { memo, useId, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import type { TouchedFileView } from '@studio/events';
import { fill } from './fill.js';

export interface TouchedFilesProps {
  files: readonly TouchedFileView[];
  isStreaming?: boolean;
  chevronIcon?: IconType;
  strings: {
    title: string;
    editedOne: string;
    editedMany: string;
    showOneMore: string;
    showMore: string;
    showLess: string;
    open: string;
    statuses: Record<TouchedFileView['status'], string>;
  };
  onOpen: (path: string) => void;
}

function LineCounts({ additions, deletions }: { additions: number; deletions: number }): React.JSX.Element {
  return <span style={{ display: 'inline-flex', gap: 'var(--spacing-1)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
    <span style={{ color: 'var(--color-text-green)' }}>+{additions}</span>
    <span style={{ color: 'var(--color-text-red)' }}>−{deletions}</span>
  </span>;
}

export const TouchedFiles = memo(function TouchedFiles({ files, isStreaming = false, chevronIcon, strings, onOpen }: TouchedFilesProps): React.JSX.Element | null {
  const titleId = useId();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  if (files.length === 0) return null;
  const edited = files.filter((file) => file.hasSuccessfulChange === true || file.status === 'edited' || file.status === 'created' || file.status === 'deleted' || file.additions !== undefined);
  const hasTotals = edited.length > 0 && edited.every((file) => file.additions !== undefined && file.deletions !== undefined);
  const totals = edited.reduce((total, file) => ({ additions: total.additions + (file.additions ?? 0), deletions: total.deletions + (file.deletions ?? 0) }), { additions: 0, deletions: 0 });
  const title = isStreaming || edited.length === 0 ? strings.title : fill(edited.length === 1 ? strings.editedOne : strings.editedMany, { count: String(edited.length) });
  const visibleFiles = expanded ? files : files.slice(0, 3);
  const remaining = files.length - 3;
  const toggleLabel = expanded ? strings.showLess : fill(remaining === 1 ? strings.showOneMore : strings.showMore, { count: String(remaining) });
  return (
    <section aria-labelledby={titleId} data-testid="touched-files" style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: 'var(--spacing-2)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', background: 'var(--color-background-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-2)', padding: 'var(--spacing-1) var(--spacing-2) var(--spacing-2)' }}>
        <Text id={titleId} type="supporting" weight="medium">{title}</Text>
        {hasTotals && <Text type="supporting" as="span" data-testid="touched-files-totals"><LineCounts {...totals} /></Text>}
      </div>
      <ul id={listId} style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 240, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {visibleFiles.map(({ path, status, additions, deletions }) => (
          <li key={path}>
            <Button
              label={fill(strings.open, { path })}
              variant="ghost"
              size="sm"
              width="100%"
              onClick={() => onOpen(path)}
              data-testid="touched-file"
              data-path={path}
              data-status={status}
              style={{ minHeight: 32, height: 'auto', padding: 'var(--spacing-2)', justifyContent: 'space-between', textAlign: 'start', whiteSpace: 'normal', gap: 'var(--spacing-2)' }}
              endContent={
                <span style={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  {(isStreaming || status !== 'edited' || additions === undefined || deletions === undefined) && <Text type="supporting" color="inherit" style={{ whiteSpace: 'nowrap', color: status === 'failed' || status === 'denied' ? 'var(--color-text-red)' : 'var(--color-text-secondary)' }}>{strings.statuses[status]}</Text>}
                  {additions !== undefined && deletions !== undefined && <Text type="supporting" as="span"><LineCounts additions={additions} deletions={deletions} /></Text>}
                </span>
              }
            >
              <span style={{ display: 'block', overflowWrap: 'anywhere', fontWeight: 'normal' }}>{path}</span>
            </Button>
          </li>
        ))}
      </ul>
      {remaining > 0 && <Button label={toggleLabel} variant="ghost" size="sm" width="100%" data-testid="touched-files-toggle" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)} style={{ justifyContent: 'space-between', padding: 'var(--spacing-2)', color: 'var(--color-text-secondary)' }} endContent={chevronIcon === undefined ? undefined : <span aria-hidden="true" style={{ display: 'inline-flex', transform: expanded ? 'rotate(90deg)' : undefined }}><Icon icon={chevronIcon} size="sm" /></span>}>
        {toggleLabel}
      </Button>}
    </section>
  );
});
