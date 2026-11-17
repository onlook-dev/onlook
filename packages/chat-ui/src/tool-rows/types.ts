import type { IconType } from '@astryxdesign/core/Icon';

/**
 * The quiet-row register's display shapes (ONL-1939). These are render shapes,
 * not `ToolCallView` — `classify.ts` owns the mapping.
 */

/**
 * A call's lifecycle as the rows render it. `awaiting_approval` is not a row
 * state — a call parked on a permission prompt is blocked on the user, and the
 * approval box beneath it carries that. `canceled` is its own arm, not `error`:
 * a stop is not a failure, so it keeps the quiet ink and says so (ONL-2231).
 */
export type ToolRowStatus = 'running' | 'completed' | 'error' | 'canceled';

/**
 * What a row reveals when expanded. A row with no detail does not expand and
 * grows no chevron, so it never advertises an affordance opening onto nothing.
 */
export type ToolRowDetail =
  | { kind: 'file'; path: string; lineCount?: number }
  | { kind: 'shell'; command: string }
  | { kind: 'search'; pattern: string; matches?: string }
  | { kind: 'raw'; text: string };

/**
 * Every string these rows render, as a prop bag. The VERB is not here: it
 * arrives already resolved, because which verb a call gets is a classification
 * decision, not a template a component fills.
 */
export interface ToolRowsStrings {
  /** Appended to a failed row. Reference copy: `— failed`. */
  failedSuffix: string;
  /** Appended to a stopped row — the only thing that tells it from completed. Reference copy: `— stopped`. */
  canceledSuffix: string;
  /** `{count}` — the grouped-commands target, e.g. `2 commands`. */
  commandCount: string;
  /** `{target}` is `commandCount`, a phrase in the reader's language rather than a name, so its spacing is its own. */
  commandsVerb: { running: string; done: string };
  /** `{count}` — the grouped-files remainder, e.g. `+2 more`. */
  overflow: string;
  /** `{count}` — a file detail's second line, e.g. `128 lines`. */
  lineCount: string;
}


/** How a row's frame name takes the person to that frame; the app resolves the id. */
export interface ToolFrameLinks {
  icon: IconType;
  onActivate: (frameId: string) => void;
  onHover?: (frameId: string, isHovered: boolean) => void;
}
