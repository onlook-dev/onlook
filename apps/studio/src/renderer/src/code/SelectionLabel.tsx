import { Button } from '@astryxdesign/core/Button';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import type { CodeMapCandidate } from '@studio/events';

import { t, type StringKey } from '@studio/i18n';
import { OpenExternalIcon } from '../icons/glyphs.js';
import { HAIRLINE } from '../panels/rowGeometry.js';
import { fileName } from './breadcrumb.js';
import type { TintLabel } from './tintLabel.js';

export interface SelectionLabelProps {
  label: TintLabel;
  /** Shown only when the label says Studio is guessing. */
  others: readonly CodeMapCandidate[];
  sourceElsewhere?: CodeMapCandidate | null;
  onOpen: (candidate: CodeMapCandidate, source?: 'selection') => void;
}

const STATUS: Partial<Record<StringKey, StringKey>> = {
  'code.tint.component': 'code.tint.callSite',
  'code.tint.likely': 'code.tint.possibleMatch',
  'code.tint.guess': 'code.tint.possibleMatch',
  'code.tint.unconfirmed': 'code.tint.stale',
  'code.tint.declined': 'code.tint.unavailable',
};

const REACH: Partial<Record<StringKey, StringKey>> = {
  'code.tint.rows': 'code.tint.elementCount',
  'code.tint.rowsPartial': 'code.tint.partialCount',
  'code.tint.rowsUnknown': 'code.tint.shared',
  'code.tint.uses': 'code.tint.fileCount',
};

export function SelectionLabel({ label, others, sourceElsewhere = null, onOpen }: SelectionLabelProps): React.JSX.Element {
  const locations = new Map<string, CodeMapCandidate>();
  for (const candidate of others) {
    const location = `${candidate.path}:${String(candidate.line)}:${String(candidate.column)}`;
    if (!locations.has(location)) locations.set(location, candidate);
  }
  const statusKey = STATUS[label.sentenceKey];
  const reachKey = label.reachKey === 'code.tint.uses' && label.reachCount === 1
    ? 'code.tint.file'
    : label.reachKey === null ? undefined : REACH[label.reachKey];
  const location = sourceElsewhere === null ? null : `${sourceElsewhere.path}:${String(sourceElsewhere.line)}:${String(sourceElsewhere.column)}`;
  return (
    <div role="status" style={{ flexShrink: 0, minWidth: 0 }}>
      <HStack
        align="center"
        gap={1.5}
        data-testid="code-tint-label"
        data-confidence={label.sentenceKey}
        data-confident={label.claimsConfidence ? 'true' : 'false'}
        style={{
          flexShrink: 0,
          minWidth: 0,
          minHeight: 40,
          paddingInline: 'var(--spacing-3)',
          paddingBlock: 'var(--spacing-1)',
          borderBottom: HAIRLINE,
        }}
      >
        {sourceElsewhere !== null && location !== null && (
          <Button
            label={`${fileName(sourceElsewhere.path)}:${String(sourceElsewhere.line)}`}
            icon={<Icon icon={OpenExternalIcon} size="sm" />}
            tooltip={`${location}${label.component === null ? '' : ` · ${label.component}`} · ${t(label.sentenceKey)}`}
            aria-label={t(label.sentenceKey === 'code.tint.exact' ? 'code.tint.source' : label.sentenceKey === 'code.tint.component' ? 'code.tint.componentSource' : 'code.tint.possibleSource', { name: location })}
            variant="ghost"
            size="sm"
            data-testid="code-tint-source"
            data-path={sourceElsewhere.path}
            style={{ minWidth: 0, flexShrink: 1, justifyContent: 'flex-start', paddingInline: 0 }}
            onClick={() => onOpen(sourceElsewhere, 'selection')}
          />
        )}
        {statusKey !== undefined && (
          <Tooltip content={t(label.sentenceKey)}>
            <Text type="supporting" color="secondary" tabIndex={0} aria-label={t(label.sentenceKey)}
              data-testid="code-tint-confidence" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t(statusKey)}
            </Text>
          </Tooltip>
        )}
        {reachKey !== undefined && label.reachKey !== null && (
          <Tooltip content={t(label.reachKey, { count: String(label.reachCount) })}>
            <Text type="supporting" color="secondary" tabIndex={0}
              aria-label={t(label.reachKey, { count: String(label.reachCount) })}
              data-testid="code-tint-reach" style={{ whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {t(reachKey, { count: String(label.reachCount) })}
            </Text>
          </Tooltip>
        )}
        {label.showsCandidates && locations.size > 0 && (
          <DropdownMenu
            data-testid="code-tint-candidates"
            hasChevron={false}
            button={{ label: t(locations.size === 1 ? 'code.tint.match' : 'code.tint.matches', { count: String(locations.size) }), tooltip: t('code.tint.others'), variant: 'ghost', size: 'sm', style: { flexShrink: 0, paddingInline: 0 } }}
          >
            {[...locations].map(([candidateLocation, candidate]) => (
              <DropdownMenuItem
                key={candidateLocation}
                label={t('code.tint.open', { name: candidateLocation })}
                onClick={() => onOpen(candidate)}
              />
            ))}
          </DropdownMenu>
        )}
      </HStack>
    </div>
  );
}
