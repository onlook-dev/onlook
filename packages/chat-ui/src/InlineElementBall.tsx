import type { ReactNode } from 'react';

export interface InlineElementBallProps {
  /** Names what the press does — the ball has no visible words of its own. */
  label: string;
  /** The sparkle. A glyph node, so the app's icon family owns the drawing. */
  icon: ReactNode;
  onExpand: () => void;
  /** Opened into the input: still mounted, as the point the card gathers back into, but inert. */
  isExpanded?: boolean;
  /** Elements gathered so far, anchor included. */
  count?: number;
  hasDraft?: boolean;
}

/** Not focused on mount: the canvas keeps its shortcuts until the user asks for the prompt (ONL-2455). */
export function InlineElementBall({
  label,
  icon,
  onExpand,
  isExpanded = false,
  count = 1,
  hasDraft = false,
}: InlineElementBallProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="inline-element-ball"
      data-testid="inline-element-ball"
      data-draft={hasDraft ? 'true' : undefined}
      inert={isExpanded}
      aria-label={label}
      title={label}
      // No focus on press, so a click that expands hands focus straight to the input.
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onExpand}
    >
      {/* Its own box, so the morph can turn the sparkles while their entry twinkle plays inside. */}
      <span className="inline-element-ball-glyph">{icon}</span>
      {count > 1 ? (
        <span className="inline-element-ball-count" aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  );
}
