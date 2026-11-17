import { VStack } from '@astryxdesign/core/Layout';
import { INK_TARGET } from './ink.js';
import { fill } from '../fill.js';
import type { ToolRowDetail, ToolRowsStrings } from './types.js';

const MONO = {
  fontFamily: 'var(--font-family-code)',
  fontSize: 'var(--font-size-xs)',
  color: INK_TARGET,
  margin: 0,
} as const;

/** The height cap is what keeps a grep matching 400 lines from turning one expanded row into the whole panel. */
function Payload({ text }: { text: string }): React.JSX.Element {
  return (
    <pre
      data-testid="tool-row-detail-payload"
      style={{
        ...MONO,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxHeight: 128,
        overflow: 'auto',
        background: 'var(--color-background-muted)',
        borderRadius: 'var(--radius-element)',
        padding: 'var(--spacing-1-5)',
      }}
    >
      {text}
    </pre>
  );
}

export function ToolRowDetailView({
  detail,
  strings,
}: {
  detail: ToolRowDetail;
  strings: ToolRowsStrings;
}): React.JSX.Element {
  if (detail.kind === 'file') {
    return (
      <VStack gap={0} width="100%" data-testid="tool-row-detail">
        <div style={{ ...MONO, overflowWrap: 'anywhere' }}>{detail.path}</div>
        {detail.lineCount !== undefined && (
          <div style={{ ...MONO, color: 'var(--color-text-disabled)' }}>
            {fill(strings.lineCount, { count: detail.lineCount })}
          </div>
        )}
      </VStack>
    );
  }

  if (detail.kind === 'shell') {
    return (
      <VStack gap={0} width="100%" data-testid="tool-row-detail">
        <pre
          style={{
            ...MONO,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            background: 'var(--color-background-muted)',
            borderRadius: 'var(--radius-element)',
            padding: 'var(--spacing-1-5)',
          }}
        >
          {/* The `$` is drawn and unselectable; a copied command carries no prompt into someone's shell. */}
          <span style={{ color: 'var(--color-text-disabled)', userSelect: 'none' }}>
            {'$ '}
          </span>
          {detail.command}
        </pre>
      </VStack>
    );
  }

  if (detail.kind === 'search') {
    return (
      <VStack gap={1} width="100%" data-testid="tool-row-detail">
        <div style={{ ...MONO, overflowWrap: 'anywhere' }}>{detail.pattern}</div>
        {detail.matches != null && <Payload text={detail.matches} />}
      </VStack>
    );
  }

  return (
    <VStack gap={0} width="100%" data-testid="tool-row-detail">
      <Payload text={detail.text} />
    </VStack>
  );
}
