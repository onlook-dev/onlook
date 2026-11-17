// The file bridge's vocabulary. Every path on it is worktree-relative: main takes the project from the asking view and re-checks containment itself (ONL-2563).

/** Every refusal the read, list and search channels answer with; the renderer owns the sentence for each. */
export type CodeRefusalCode =
  | 'no-project'
  | 'out-of-scope'
  | 'not-found'
  | 'not-text'
  | 'too-large'
  | 'unreadable';

/** Iterable for the renderer's copy table, which has to cover every member. */
export const CODE_REFUSAL_CODES = [
  'no-project',
  'out-of-scope',
  'not-found',
  'not-text',
  'too-large',
  'unreadable',
] as const satisfies readonly CodeRefusalCode[];

export type CodeEol = '\n' | '\r\n';

/** What the file was when it was opened: the hash alone decides a stale write, and the rest is what keeps a save byte-faithful. */
export interface CodeSnapshot {
  /** sha256 of the file's bytes, hex. */
  hash: string;
  size: number;
  mtimeMs: number;
  eol: CodeEol;
  /** Permission bits only, passed back through the write so an executable file stays executable. */
  mode: number;
  /** The text carries no byte-order mark; the write restores it. */
  bom: boolean;
}

export interface CodeReadRequest {
  path: string;
}

/** `path` echoes the request's spelling, not the canonical target: it is the key a tab is held under. */
export type CodeReadResult =
  | { ok: true; path: string; text: string; snapshot: CodeSnapshot; image?: { dataUrl: string } }
  | { ok: false; code: CodeRefusalCode };

/** Image tabs are read-only and cross the same project-scoped read channel. */
export const CODE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const CODE_IMAGE_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', svg: 'image/svg+xml',
};

export function codeImageMediaType(path: string): string | null {
  const name = path.split('/').at(-1) ?? path;
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? null : CODE_IMAGE_TYPES[name.slice(dot + 1).toLowerCase()] ?? null;
}

export interface CodeListRequest {
  /** Absent or empty is the project root. */
  path?: string;
}

export type CodeListResult =
  | { ok: true; files: readonly string[]; truncated: boolean }
  | { ok: false; code: CodeRefusalCode };

export interface CodeSearchRequest {
  query: string;
  /** Absent or empty searches the whole project. */
  path?: string;
}

export interface CodeSearchLine {
  /** 1-based, as the editor counts. */
  line: number;
  text: string;
  /** 0-based, within `text`. */
  column: number;
}

export interface CodeSearchFileMatches {
  path: string;
  /** Capped per file; `total` counts every match the file holds. */
  lines: readonly CodeSearchLine[];
  total: number;
}

export type CodeSearchResult =
  | {
      ok: true;
      names: readonly string[];
      contents: readonly CodeSearchFileMatches[];
      truncated: boolean;
    }
  | { ok: false; code: CodeRefusalCode };

/**
 * Why a save did not land. No code for a file DELETED since it was opened: a dirty tab recreates
 * it, which containment on the nearest existing ancestor makes sound (ONL-2563).
 */
export type CodeWriteRefusalCode =
  | 'no-project'
  | 'out-of-scope'
  | 'stale'
  | 'permission'
  | 'no-space'
  | 'unwritable';

export const CODE_WRITE_REFUSAL_CODES = [
  'no-project',
  'out-of-scope',
  'stale',
  'permission',
  'no-space',
  'unwritable',
] as const satisfies readonly CodeWriteRefusalCode[];

export interface CodeWriteRequest {
  path: string;
  text: string;
  /**
   * What the renderer believes is on disk. The write returns the new one, which is what makes a
   * second save of the same tab possible (ONL-2563).
   */
  expected: CodeSnapshot;
}

export type CodeWriteResult =
  | { ok: true; path: string; snapshot: CodeSnapshot }
  | { ok: false; code: CodeWriteRefusalCode };

/** Files the agent just wrote, in the same spelling a tab is opened under — one spelling across the seam is the break a clash fails on (ONL-2563). */
export interface CodeWrittenReport {
  paths: readonly string[];
}

/** Whether this view is holding code the designer has not saved. */
export interface CodeDirtyReport {
  isDirty: boolean;
}

/** What the Frame's running React said about one element. Parsed at the boundary: it crosses from an untrusted page (ONL-2563). */
export interface CodeElementEvidence {
  tag: string;
  classes: readonly string[];
  text: string;
}

export type ComponentReading =
  | {
      ok: true;
      /**
       * The nearest component's display name, or null for a bare host element. The DEV TRANSFORM'S
       * name: under React 19 Fast Refresh `Memoed` reads back as `Memoed2` (ONL-2563).
       */
      component: string | null;
      /** Owner-stack frames, newest first, as the page spelled them. */
      frames: readonly string[];
      /** True only when the selected host element carries its own creation location. */
      direct?: boolean;
      /**
       * The same, for the components ABOVE the element: a styled wrapper or any dependency-drawn
       * element is created inside `node_modules`, and the nearest line the designer wrote is the one
       * that draws THAT component (ONL-2563).
       */
      ownerFrames: readonly string[];
      /**
       * Which React the page is running. A PRODUCTION build carries minified component names and no
       * owner stack, so a name matched against one is a confident wrong answer (ONL-2563).
       */
      react: 'development' | 'production' | 'none';
      /** Live repetitions of the selected creation site, not unrelated same-tag ancestors. */
      siblings: number;
      siblingsComplete?: boolean;
      evidence?: CodeElementEvidence;
    }
  | { ok: false; why: 'no-element' | 'no-react' | 'unreadable' };

/** Why an identify could not be answered. A DECLINE, never a rejected invoke: the panel words all three the same way. */
export type CodeIdentifyDecline = 'unaddressable' | 'attachment-unavailable' | 'failed';

export interface CodeIdentifyRequest {
  /** The canvas document the frame is on. The renderer owns this id; it is not a path. */
  docId: string;
  frameId: string;
  /** `tag:nth-of-type` segments, `>`-joined — the same spelling element evidence carries. */
  domPath: string;
  /** The pick this is for. Two picks on one element answer from the cache rather than attaching twice. */
  evidenceId: string;
}

export type CodeIdentifyResult =
  | { ok: true; reading: ComponentReading }
  | { ok: false; decline: CodeIdentifyDecline };

/** How sure Studio is. A closed union: `tintLabel.ts` is the one grade-to-copy map, and telemetry carries these values rather than a second string (ONL-2563). */
export type CodeMapGrade = 'exact' | 'likely' | 'best-guess';

/** The evidence route that placed the source candidate. */
export type CodeMapVia = 'owner-stack' | 'component-stack' | 'name-search' | 'element-search';

export interface CodeMapCandidate {
  /** Worktree-relative, the same spelling a tab is opened under. */
  path: string;
  /** 1-based, both axes, as the editor counts. */
  line: number;
  column: number;
  via: CodeMapVia;
}

export interface CodeMapping extends CodeMapCandidate {
  /**
   * Where the component is DECLARED, which is a different place from where this element sits:
   * Open component and Open element are two verbs because they are two answers (ONL-2563).
   */
  definition: CodeMapCandidate | null;
  grade: CodeMapGrade;
  /** The dev transform's component name, with `ComponentReading`'s warranty. */
  component: string | null;
  /** Other places this could be, each one click away. Empty unless the grade is a best guess. */
  others: readonly CodeMapCandidate[];
  /** Files using this component, excluding where it is declared; 0 when nothing was searched. */
  uses: number;
  /** Elements the matched position produced; more than 1 is a list row. */
  produced: number;
  producedComplete: boolean;
}

/** One component instance on a page: the element its instance occupies, and what React calls it. */
export interface ComponentBoundary {
  /** `tag:nth-of-type` segments, `>`-joined — the spelling element evidence carries. */
  domPath: string;
  component: string;
}

/** Read once per page load and cached by the Frame, never per hover: the round trip takes an exclusive debugger (ONL-2563). */
export type CodeComponentMapResult =
  | { ok: true; boundaries: readonly ComponentBoundary[] }
  | { ok: false; decline: CodeIdentifyDecline };

export interface CodeComponentMapRequest {
  docId: string;
  frameId: string;
  /** Changes with every page load, so a navigated Frame is re-read rather than answered from the cache. */
  loadToken: string;
}

/** Why a selection could not be placed. The panel words all three with ONE sentence, so these distinctions are for telemetry and the log, never for copy. */
export type CodeMapDecline = CodeIdentifyDecline | 'no-element' | 'no-react' | 'unmapped';

export interface CodeMapRequest extends CodeIdentifyRequest {
  /** Paths whose open buffer has moved under any mapping; the panel is the one side that knows, and a mapping onto one keeps its tint and loses its word. */
  movedPaths?: readonly string[];
}

export type CodeMapResult =
  | { ok: true; mapping: CodeMapping }
  | { ok: false; decline: CodeMapDecline };
