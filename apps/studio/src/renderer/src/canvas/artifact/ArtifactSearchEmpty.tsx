import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';
import './gallery.css';

const QUERY_LIMIT = 24;

function clipQuery(query: string): string {
  const trimmed = query.trim();
  return trimmed.length > QUERY_LIMIT ? `${trimmed.slice(0, QUERY_LIMIT).trimEnd()}…` : trimmed;
}

/** A search with no match: a thin-lined lens with a top-to-bottom fade (ONL-2593). */
export function ArtifactSearchEmpty({ query }: { query: string }): React.JSX.Element {
  return (
    <div className="artifact-search-empty" role="status" data-testid="artifact-search-empty">
      <svg aria-hidden="true" width="60" height="60" viewBox="0 0 52 52" fill="none">
        <defs>
          {/* One gradient for the whole drawing, or the handle restarts the fade (ONL-2593). */}
          <linearGradient id="artifact-search-ink" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="46">
            <stop offset="0" style={{ stopColor: 'rgba(255, 255, 255, 0.58)' }} />
            <stop offset="1" style={{ stopColor: 'rgba(255, 255, 255, 0.2)' }} />
          </linearGradient>
        </defs>
        {/* One path, so the stroke never overlaps itself (ONL-2593). */}
        <path
          d="M44.5 44.5 L32.607 32.607 A15 15 0 1 1 11.393 11.393 A15 15 0 1 1 32.607 32.607"
          style={{ stroke: 'url(#artifact-search-ink)' }}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Text size="sm" color="secondary" style={{ textAlign: 'center', overflowWrap: 'anywhere' }}>
        {t('artifact.library.noResults', { query: clipQuery(query) })}
      </Text>
    </div>
  );
}
