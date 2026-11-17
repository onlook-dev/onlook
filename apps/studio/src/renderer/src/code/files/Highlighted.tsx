import { Fragment } from 'react';

import { matchRanges } from './matchRanges.js';

/** The matched term inside a result, marked where it was found rather than left for the eye (ONL-2563). */
export function Highlighted({ text, query }: { text: string; query: string }): React.JSX.Element {
  const parts = matchRanges(text, query);
  if (parts.length === 1 && !parts[0]?.isMatch) return <>{text}</>;
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={`${String(index)}-${part.text}`}>
          {part.isMatch ? (
            <mark
              data-testid="code-files-match"
              style={{
                backgroundColor: 'var(--color-accent-muted)',
                color: 'var(--color-text-accent)',
                borderRadius: 2,
                paddingInline: 1,
              }}
            >
              {part.text}
            </mark>
          ) : (
            part.text
          )}
        </Fragment>
      ))}
    </>
  );
}
