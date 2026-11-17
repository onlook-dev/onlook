import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');

interface Boundary {
  readonly what: string;
  readonly matches: (specifier: string) => boolean;
  readonly polarity: 'confined-to' | 'forbidden-from';
  readonly dir: string;
  readonly because: string;
}

interface SourceBoundary {
  readonly what: string;
  readonly file: string;
  readonly token: string;
  readonly because: string;
}

interface TokenBoundary {
  readonly what: string;
  /** Matched against file content, not import specifiers. */
  readonly pattern: RegExp;
  readonly scope: string;
  readonly allowedDirs: readonly string[];
  readonly because: string;
  /** Per-file ceiling for pre-existing sites; an excess is a violation (ONL-2226). */
  readonly grandfathered: Readonly<Record<string, { readonly count: number; readonly because: string }>>;
  readonly skip?: RegExp;
}

const BOUNDARIES: readonly Boundary[] = [
  {
    what: 'the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)',
    matches: (s) => s === '@anthropic-ai/claude-agent-sdk' || s.startsWith('@anthropic-ai/claude-agent-sdk/'),
    polarity: 'confined-to',
    dir: 'apps/studio/src/main/agent-host',
    because: 'nothing downstream of the agent host may see an SDK message object',
  },
  {
    what: "a tab view's stores from the chrome view",
    matches: (s) =>
      /(^|\/)(agent|canvas|workspace|panels|chat|projects|create|git-status)\/store(\.js)?$/.test(s),
    polarity: 'forbidden-from',
    dir: 'apps/studio/src/renderer/src/chrome',
    because:
      'the chrome view is a separate process with no project and no session; it renders from pushed facts alone (ONL-2206)',
  },
  {
    what: 'the main process from the pure git-ui package',
    matches: (s) => s.split('/').includes('main'),
    polarity: 'forbidden-from',
    dir: 'packages/git-ui',
    because: 'git-ui renders a state from props; measurement and git live in the app (ONL-2172)',
  },
  {
    what: 'the main process from the pure onboarding-ui package',
    matches: (s) => s.split('/').includes('main'),
    polarity: 'forbidden-from',
    dir: 'packages/onboarding-ui',
    because: 'onboarding-ui renders a state from props; probes and sign-in live in the app (ONL-2176)',
  },
  {
    what: 'the provider API (`main/cloud/provider-api.ts`)',
    matches: (s) => /(^|\/)provider-api(\.[jt]s)?$/.test(s),
    polarity: 'confined-to',
    // Its own suite is the one importer: the module is for a separately built provider, not for the editor.
    dir: 'apps/studio/src/main/cloud/provider-api.test.ts',
    because: 'the editor imports the modules it re-exports directly, so the list stays what a provider uses',
  },
];

const SOURCE_BOUNDARIES: readonly SourceBoundary[] = [
  {
    what: 'direct React effects in the canvas shell',
    file: 'apps/studio/src/renderer/src/canvas/Canvas.tsx',
    token: 'useEffect',
    because:
      'gesture work belongs to event-owned seats and external synchronization belongs to purpose-named hooks or adapters',
  },
];

const TOKEN_BOUNDARIES: readonly TokenBoundary[] = [
  {
    what: 'unguarded Electron IPC registration',
    pattern: /(?:\bimport\s*(?:\w+\s*,\s*)?\{[^}]*\bipcMain\b[^}]*\}\s*from\s*['"]electron['"]|\belectron\.ipcMain\b)/g,
    scope: 'apps/studio/src/main',
    allowedDirs: ['apps/studio/src/main/ipc'],
    because: 'every app IPC registration uses the main-owned view and frame guard in ipc/bridge.ts',
    grandfathered: {},
    skip: /\.(?:test|pty|live|e2e)\.tsx?$/,
  },
  {
    what: '`BrowserWindow.getAllWindows()`',
    pattern: /BrowserWindow\.getAllWindows\(/g,
    scope: 'apps/studio/src/main',
    allowedDirs: ['apps/studio/src/main/window', 'apps/studio/src/main/tabs'],
    because: 'returns an EMPTY list once the app is views-in-a-BaseWindow; `BaseWindow.getAllWindows()` holds both (ONL-2226, ONL-2430)',
    grandfathered: {},
  },
  {
    what: '`BrowserWindow.fromWebContents()`',
    pattern: /BrowserWindow\.fromWebContents\(/g,
    scope: 'apps/studio/src/main',
    allowedDirs: ['apps/studio/src/main/window', 'apps/studio/src/main/tabs'],
    because: 'returns the BaseWindow for a WebContentsView sender, which has no `webContents` (ONL-2226, ONL-2430)',
    grandfathered: {},
  },
  {
    what: 'a bare `console` call in product source',
    pattern: /(?<![.\w])console\.(?:log|warn|error|info|debug|trace)\(/g,
    scope: 'apps/studio/src',
    allowedDirs: [
      'apps/studio/src/main/log',
      'apps/studio/src/renderer/src/log.ts',
      // Templates for the user's `server.mjs`; the console is the child's.
      'apps/studio/src/main/starter/scaffold.ts',
      'apps/studio/src/main/starter/adapters/static.ts',
      'apps/studio/src/main/starter/adapters/react.ts',
    ],
    because: 'every line goes through main/log/ so it carries the ids and the privacy guardrail (ONL-2347); probes use probeOutput',
    grandfathered: {},
    skip: /\.(?:test|pty|live|e2e)\.tsx?$/,
  },
];

/** Lowest first: a file imports its own layer and the ones before it. */
export const LAYERS = ['kit', 'shell', 'features', 'entries'] as const;
type Layer = (typeof LAYERS)[number];

const RENDERER_SRC = 'apps/studio/src/renderer/src';

/** Keyed by a folder or a file under `renderer/src`; a file's own row beats its folder's. */
export const RENDERER_LAYERS: Readonly<Record<string, Layer>> = {
  'AstryxLanguage.tsx': 'kit',
  'FailureDialogBody.tsx': 'kit',
  'RegionErrorBoundary.tsx': 'kit',
  'RenameField.tsx': 'kit',
  agents: 'kit',
  assets: 'kit',
  'attachments.ts': 'kit',
  'bridge.ts': 'kit',
  'capabilities.ts': 'kit',
  'env.d.ts': 'kit',
  'errors.ts': 'kit',
  fan: 'kit',
  flags: 'kit',
  icons: 'kit',
  'inputModality.ts': 'kit',
  'log.ts': 'kit',
  menu: 'kit',
  'nodeLabel.ts': 'kit',
  'mirror.ts': 'kit',
  'reducedMotion.ts': 'kit',
  overlay: 'kit',
  panel: 'kit',
  perf: 'kit',
  'refusal.ts': 'kit',
  reorder: 'kit',
  replay: 'kit',
  'restingMock.ts': 'kit',
  'settings/derive.ts': 'kit',
  'setupStepNames.ts': 'kit',
  shortcuts: 'kit',
  'tabIdentity.ts': 'kit',
  theme: 'kit',
  'tooltipWarmth.ts': 'kit',
  'useLatestRef.ts': 'kit',

  'ParkedScreen.tsx': 'shell',
  activation: 'shell',
  agent: 'shell',
  app: 'shell',
  chrome: 'shell',
  diagnostics: 'shell',
  'git-status': 'shell',
  'heldProject.ts': 'shell',
  'layout.ts': 'shell',
  notifications: 'shell',
  panels: 'shell',
  rail: 'shell',
  'settings/store.ts': 'shell',
  'sidebar/footStore.ts': 'shell',
  'tips/early.ts': 'shell',
  'tips/lifetime.ts': 'shell',
  'tips/moment.ts': 'shell',
  'tips/onScreen.ts': 'shell',
  topbar: 'shell',
  workspace: 'shell',

  'agent-setup': 'features',
  agentStatus: 'features',
  canvas: 'features',
  chat: 'features',
  cloud: 'features',
  code: 'features',
  create: 'features',
  'github-import': 'features',
  login: 'features',
  onboarding: 'features',
  'project-setup': 'features',
  projects: 'features',
  report: 'features',
  server: 'features',
  settings: 'features',
  sidebar: 'features',
  'task-manager': 'features',
  telemetry: 'features',
  tips: 'features',
  tour: 'features',

  'App.tsx': 'entries',
  'Root.tsx': 'entries',
  'boot.ts': 'entries',
  'chrome/entry.tsx': 'entries',
  dev: 'entries',
  'main.tsx': 'entries',
  'task-manager/entry.tsx': 'entries',
  testing: 'entries',
};

/** Keyed by a repo path outside `renderer/src`. */
export const OUTSIDE_LAYERS: Readonly<Record<string, Layer>> = {
  'apps/studio/src/renderer/lab': 'entries',
  'packages/chat-ui': 'kit',
  'packages/git-ui': 'kit',
  'packages/i18n': 'kit',
  'packages/onboarding-ui': 'kit',
};

const WORKSPACE_PACKAGES: Readonly<Record<string, string>> = {
  '@studio/chat-ui': 'packages/chat-ui',
  '@studio/git-ui': 'packages/git-ui',
  '@studio/i18n': 'packages/i18n',
  '@studio/onboarding-ui': 'packages/onboarding-ui',
};

export const LAYER_BASELINE = 'scripts/check-imports.layers.txt';
const EDGE_ARROW = ' → ';

const APP_SRC = 'apps/studio/src';
const MAIN_SRC = `${APP_SRC}/main`;

/** Folders under `main/`, lowest first: a leaf's files import, from the app's source, only `MAIN_BASE`, their own folder and the leaves before it. */
export const MAIN_LEAVES: readonly string[] = ['state', 'log', 'flags', 'telemetry'];

/** Files under `main/` below every leaf; they import only one another. */
export const MAIN_BASE: readonly string[] = [
  'build-kind.ts',
  'lib/canonical-path.ts',
  'env/dev-switches.ts',
  'env/platform.ts',
  'env/switch.ts',
  'fs-atomic.ts',
];

/** Files inside a leaf's folder that sit above every leaf: they register handlers, so they import what a leaf may not, and no leaf imports them. */
export const MAIN_ABOVE_LEAVES: readonly string[] = ['telemetry/ipc.ts'];

export const LEAF_BASELINE = 'scripts/check-imports.leaves.txt';

/** Loaded by every page's entry, so a class in one of them needs no import of its own. */
export const GLOBAL_SHEETS: readonly string[] = [`${RENDERER_SRC}/styles.css`, `${RENDERER_SRC}/theme/studio.css`];

export const STYLE_BASELINE = 'scripts/check-imports.styles.txt';

/** Every class a sheet's selectors name. Comments, strings and declarations are not selectors. */
export function sheetClasses(css: string): Set<string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  const classes = new Set<string>();
  let prelude = '';
  for (const char of text) {
    if (char === '{') {
      if (!prelude.trimStart().startsWith('@')) {
        for (const match of prelude.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) if (match[1]) classes.add(match[1]);
      }
      prelude = '';
    } else if (char === '}' || char === ';') {
      prelude = '';
    } else {
      prelude += char;
    }
  }
  return classes;
}

const CLASS_SEAT = /\bclassName\s*[=:]\s*|\bclassList\s*\.\s*(?:add|remove|toggle)\s*(?=\()/g;
const STRING_LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const CLOSER: Readonly<Record<string, string>> = { '{': '}', '(': ')' };

/** Every word of a string literal handed to `className=` or `classList`: the classes a file writes on an element. A class named in a query, a test id or a comment is not written. */
export function classesWritten(source: string): Set<string> {
  const written = new Set<string>();
  for (const seat of source.matchAll(CLASS_SEAT)) {
    const start = seat.index + seat[0].length;
    const open = source[start] ?? '';
    let end = start;
    if (open === '"' || open === "'") {
      end = source.indexOf(open, start + 1) + 1;
    } else if (Object.hasOwn(CLOSER, open)) {
      let depth = 0;
      for (end = start; end < source.length; end += 1) {
        if (source[end] === open) depth += 1;
        else if (source[end] === CLOSER[open] && --depth === 0) break;
      }
      end += 1;
    }
    for (const literal of source.slice(start, Math.max(start, end)).matchAll(STRING_LITERAL)) {
      for (const word of (literal[1] ?? literal[2] ?? literal[3] ?? '').split(/[^\w-]+/)) if (word) written.add(word);
    }
  }
  return written;
}

const SHEET_IMPORT = /(?:\bimport\s*(?:\(\s*)?|\bfrom\s*)['"]([^'"]+\.css)['"]/g;

/** 0 for a base file, then a leaf's place in `MAIN_LEAVES`; `undefined` for everything above them, `MAIN_ABOVE_LEAVES` included. */
function leafRank(rel: string): number | undefined {
  if (!rel.startsWith(`${MAIN_SRC}/`)) return undefined;
  const inside = rel.slice(MAIN_SRC.length + 1);
  if (MAIN_BASE.includes(inside)) return 0;
  if (MAIN_ABOVE_LEAVES.includes(inside)) return undefined;
  const at = MAIN_LEAVES.indexOf(inside.split('/')[0] ?? inside);
  return at === -1 ? undefined : at + 1;
}
const TEST_FILE = /\.(?:test|pty|live|e2e)\.tsx?$/;

interface Seat {
  /** The table row that placed the file; two files of one feature share it. */
  readonly row: string;
  readonly layer: Layer | undefined;
}

function seatOf(rel: string): Seat | undefined {
  if (rel.startsWith(`${RENDERER_SRC}/`)) {
    const inside = rel.slice(RENDERER_SRC.length + 1);
    const top = inside.split('/')[0] ?? inside;
    const row = Object.hasOwn(RENDERER_LAYERS, inside) ? inside : top;
    return { row, layer: RENDERER_LAYERS[row] };
  }
  for (const [row, layer] of Object.entries(OUTSIDE_LAYERS)) {
    if (rel === row || rel.startsWith(`${row}/`)) return { row, layer };
  }
  return undefined;
}

function importTarget(root: string, rel: string, specifier: string): string | undefined {
  const bare = specifier.split('?')[0] ?? specifier;
  let target: string | undefined;
  if (bare.startsWith('.')) {
    target = relative(root, join(root, dirname(rel), bare));
  } else if (bare.startsWith('@renderer/')) {
    target = `${RENDERER_SRC}/${bare.slice('@renderer/'.length)}`;
  } else {
    for (const [name, dir] of Object.entries(WORKSPACE_PACKAGES)) {
      if (bare === name || bare.startsWith(`${name}/`)) target = `${dir}${bare.slice(name.length)}`;
    }
  }
  if (target === undefined) return undefined;
  const stem = target.replace(/\.jsx?$/, '');
  if (stem === target) return target;
  return [`${stem}.ts`, `${stem}.tsx`].find((candidate) => existsSync(join(root, candidate))) ?? target;
}

function layerBreach(from: Seat, to: Seat): string | undefined {
  if (from.layer === undefined || to.layer === undefined || from.row === to.row) return undefined;
  if (LAYERS.indexOf(to.layer) > LAYERS.indexOf(from.layer)) return `${from.layer}${EDGE_ARROW}${to.layer}`;
  if (from.layer === 'features' && to.layer === 'features') return `features${EDGE_ARROW}features`;
  return undefined;
}

function readBaseline(root: string, file: string): string[] {
  const path = join(root, file);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter((line) => line !== '');
}

const SCAN_ROOTS =['apps', 'packages', 'scripts', 'tests'];
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', 'release', 'test-results']);
const EXTENSIONS = /\.(ts|tsx|mts|mjs)$/;
const SHEETS = /\.css$/;

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

function* sourceFiles(dir: string, extensions: RegExp = EXTENSIONS): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* sourceFiles(path, extensions);
    } else if (extensions.test(entry)) {
      yield path;
    }
  }
}

interface ImportViolation {
  kind: 'import';
  file: string;
  specifier: string;
  boundary: Boundary;
}

interface SourceViolation {
  kind: 'source';
  file: string;
  token: string;
  boundary: SourceBoundary;
}

interface TokenViolation {
  kind: 'token';
  file: string;
  extra: number;
  boundary: TokenBoundary;
}

interface LayerViolation {
  kind: 'layer';
  file: string;
  target: string;
  /** `<from layer> → <to layer>`. */
  pair: string;
  edge: string;
}

interface LeafViolation {
  kind: 'leaf';
  file: string;
  target: string;
  edge: string;
}

interface StyleViolation {
  kind: 'style';
  file: string;
  sheet: string;
  /** The classes of `sheet` the file writes. */
  classes: string[];
  edge: string;
}

interface StaleViolation {
  kind: 'stale';
  file: typeof LAYER_BASELINE | typeof LEAF_BASELINE | typeof STYLE_BASELINE;
  edge: string;
}

interface UnassignedViolation {
  kind: 'unassigned';
  file: string;
  row: string;
}

type Violation =
  | ImportViolation
  | SourceViolation
  | TokenViolation
  | LayerViolation
  | LeafViolation
  | StyleViolation
  | StaleViolation
  | UnassignedViolation;

export interface LayerEdge {
  readonly edge: string;
  readonly pair: string;
  readonly fromRow: string;
  readonly toRow: string;
}

export interface CheckImportsOptions {
  root?: string;
  scanRoots?: readonly string[];
  /** The edges allowed to break the layers; read from `LAYER_BASELINE` under `root` when absent. */
  layerBaseline?: readonly string[];
  /** The imports allowed to leave a leaf upward; read from `LEAF_BASELINE` under `root` when absent. */
  leafBaseline?: readonly string[];
  /** The files allowed to write a sheet's class without importing it; read from `STYLE_BASELINE` under `root` when absent. */
  styleBaseline?: readonly string[];
}

export function checkImports(options: CheckImportsOptions = {}): {
  scanned: number;
  violations: Violation[];
  /** Every import that breaks the layers today, baselined or not, sorted. */
  layerEdges: LayerEdge[];
  /** Every import that leaves a leaf upward today, baselined or not, sorted. */
  leafEdges: string[];
  /** Every file that writes a sheet's class without importing the sheet today, baselined or not, sorted. */
  styleEdges: string[];
} {
  const root = options.root ?? repoRoot;
  const scanRoots = options.scanRoots ?? SCAN_ROOTS;
  const baseline = new Set(options.layerBaseline ?? readBaseline(root, LAYER_BASELINE));
  const leafBaseline = new Set(options.leafBaseline ?? readBaseline(root, LEAF_BASELINE));
  const violations: Violation[] = [];
  const breaches = new Map<string, LayerEdge>();
  const leafBreaches = new Set<string>();
  const styleBaseline = new Set(options.styleBaseline ?? readBaseline(root, STYLE_BASELINE));
  const styleBreaches = new Map<string, StyleViolation>();
  const unassigned = new Set<string>();
  let scanned = 0;

  /** Class → the component sheets whose selectors name it. */
  const sheetsOf = new Map<string, string[]>();
  for (const scanRoot of scanRoots) {
    const abs = join(root, scanRoot);
    if (!existsSync(abs)) continue;
    for (const file of sourceFiles(abs, SHEETS)) {
      const sheet = relative(root, file);
      if (seatOf(sheet) === undefined || GLOBAL_SHEETS.includes(sheet)) continue;
      for (const name of sheetClasses(readFileSync(file, 'utf8'))) sheetsOf.set(name, [...(sheetsOf.get(name) ?? []), sheet]);
    }
  }

  for (const scanRoot of scanRoots) {
    const abs = join(root, scanRoot);
    // A missing scan root fails the lint rather than scanning less (ONL-1870).
    if (!statSync(abs).isDirectory()) {
      throw new Error(`check-imports: scan root is not a directory: ${scanRoot}`);
    }
    for (const file of sourceFiles(abs)) {
      scanned++;
      const rel = relative(root, file);
      const content = readFileSync(file, 'utf8');
      for (const boundary of SOURCE_BOUNDARIES) {
        if (rel === boundary.file && content.includes(boundary.token)) {
          violations.push({ kind: 'source', file: rel, token: boundary.token, boundary });
        }
      }
      for (const boundary of TOKEN_BOUNDARIES) {
        if (boundary.skip?.test(rel)) continue;
        if (rel !== boundary.scope && !rel.startsWith(`${boundary.scope}/`)) continue;
        const found = content.match(boundary.pattern)?.length ?? 0;
        if (found === 0) continue;
        const insideAllowed = boundary.allowedDirs.some(
          (dir) => rel === dir || rel.startsWith(`${dir}/`),
        );
        if (insideAllowed) continue;
        const allowed = boundary.grandfathered[rel]?.count ?? 0;
        if (found > allowed) {
          violations.push({ kind: 'token', file: rel, extra: found - allowed, boundary });
        }
      }
      const seat = TEST_FILE.test(rel) ? undefined : seatOf(rel);
      const rank = TEST_FILE.test(rel) ? undefined : leafRank(rel);
      if (seat !== undefined && seat.layer === undefined && !unassigned.has(seat.row)) {
        unassigned.add(seat.row);
        violations.push({ kind: 'unassigned', file: rel, row: seat.row });
      }
      if (seat !== undefined && sheetsOf.size > 0) {
        const imported = new Set<string>();
        for (const match of content.matchAll(SHEET_IMPORT)) {
          const target = match[1] ? importTarget(root, rel, match[1]) : undefined;
          if (target !== undefined) imported.add(target);
        }
        for (const name of [...classesWritten(content)].sort()) {
          const sheets = sheetsOf.get(name) ?? [];
          // A class two sheets name is at home in either.
          if (sheets.some((sheet) => imported.has(sheet))) continue;
          for (const sheet of sheets) {
            const edge = `${rel}${EDGE_ARROW}${sheet}`;
            const breach = styleBreaches.get(edge);
            if (breach) breach.classes.push(name);
            else styleBreaches.set(edge, { kind: 'style', file: rel, sheet, classes: [name], edge });
          }
        }
      }
      for (const match of content.matchAll(SPECIFIER)) {
        const specifier = match[1];
        if (!specifier) continue;
        for (const boundary of BOUNDARIES) {
          if (!boundary.matches(specifier)) continue;
          const inside = rel === boundary.dir || rel.startsWith(`${boundary.dir}/`);
          if (inside === (boundary.polarity === 'confined-to')) continue;
          violations.push({ kind: 'import', file: rel, specifier, boundary });
        }
        if (seat === undefined && rank === undefined) continue;
        const target = importTarget(root, rel, specifier);
        if (target === undefined) continue;
        if (rank !== undefined && target.startsWith(`${APP_SRC}/`) && (leafRank(target) ?? Infinity) > rank) {
          const edge = `${rel}${EDGE_ARROW}${target}`;
          if (!leafBreaches.has(edge) && !leafBaseline.has(edge)) violations.push({ kind: 'leaf', file: rel, target, edge });
          leafBreaches.add(edge);
        }
        const targetSeat = seat === undefined ? undefined : seatOf(target);
        if (seat === undefined || targetSeat === undefined) continue;
        const pair = layerBreach(seat, targetSeat);
        if (pair === undefined) continue;
        const edge = `${rel}${EDGE_ARROW}${target}`;
        if (breaches.has(edge)) continue;
        breaches.set(edge, { edge, pair, fromRow: seat.row, toRow: targetSeat.row });
        if (!baseline.has(edge)) violations.push({ kind: 'layer', file: rel, target, pair, edge });
      }
    }
  }

  for (const edge of [...baseline].sort()) {
    if (!breaches.has(edge)) violations.push({ kind: 'stale', file: LAYER_BASELINE, edge });
  }
  for (const edge of [...leafBaseline].sort()) {
    if (!leafBreaches.has(edge)) violations.push({ kind: 'stale', file: LEAF_BASELINE, edge });
  }
  const styleEdges = [...styleBreaches.keys()].sort();
  for (const edge of styleEdges) {
    const breach = styleBreaches.get(edge);
    if (breach && !styleBaseline.has(edge)) violations.push(breach);
  }
  for (const edge of [...styleBaseline].sort()) {
    if (!styleBreaches.has(edge)) violations.push({ kind: 'stale', file: STYLE_BASELINE, edge });
  }

  if (scanned === 0) {
    throw new Error('check-imports: scanned 0 files — the scan roots or extensions are wrong');
  }

  const layerEdges = [...breaches.values()].sort((a, b) => (a.edge < b.edge ? -1 : a.edge > b.edge ? 1 : 0));
  return { scanned, violations, layerEdges, leafEdges: [...leafBreaches].sort(), styleEdges };
}

function tally(keys: readonly string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

// Unguarded, an import would scan the repo and set process.exitCode inside the test run.
if (import.meta.main) {
  // Drops the baseline lines whose import is gone; it never adds one.
  if (process.argv.includes('--prune-baseline')) {
    const found = checkImports();
    const live: [string, Set<string>][] = [
      [LAYER_BASELINE, new Set(found.layerEdges.map((entry) => entry.edge))],
      [LEAF_BASELINE, new Set(found.leafEdges)],
      [STYLE_BASELINE, new Set(found.styleEdges)],
    ];
    for (const [file, edges] of live) {
      const kept = readBaseline(repoRoot, file).filter((edge) => edges.has(edge)).sort();
      writeFileSync(join(repoRoot, file), kept.map((edge) => `${edge}\n`).join(''));
    }
  }
  const { scanned, violations, layerEdges, leafEdges, styleEdges } = checkImports();

  if (process.argv.includes('--layers')) {
    console.log(`check-imports: ${String(layerEdges.length)} import(s) break the renderer layers today.`);
    for (const [pair, count] of tally(layerEdges.map((entry) => entry.pair))) {
      console.log(`  ${String(count).padStart(4)}  ${pair}`);
    }
    console.log('  by folder:');
    for (const [pair, count] of tally(layerEdges.map((entry) => `${entry.fromRow}${EDGE_ARROW}${entry.toRow}`))) {
      console.log(`  ${String(count).padStart(4)}  ${pair}`);
    }
  }

  if (violations.length === 0) {
    console.log(
      `check-imports: ${String(scanned)} files scanned, ${String(BOUNDARIES.length + SOURCE_BOUNDARIES.length + TOKEN_BOUNDARIES.length)} boundaries held; the renderer layers hold but for ${String(layerEdges.length)} baselined import(s), main's leaves but for ${String(leafEdges.length)}, and every file imports the sheet whose classes it writes but for ${String(styleEdges.length)}.`,
    );
  } else {
    console.log(`check-imports: ${String(violations.length)} boundary violation(s):`);
    for (const violation of violations) {
      console.log(`  ${violation.file}`);
      if (violation.kind === 'stale') {
        console.log(`    lists '${violation.edge}', an import that is gone`);
        console.log('    drop the line: bun run check:imports --prune-baseline');
        continue;
      }
      if (violation.kind === 'unassigned') {
        console.log(`    '${violation.row}' under ${RENDERER_SRC}/ has no layer`);
        console.log('    give it a row in RENDERER_LAYERS (scripts/check-imports.ts); CODING.md, Renderer layers, says which');
        continue;
      }
      if (violation.kind === 'style') {
        console.log(`    writes ${violation.classes.map((name) => `'${name}'`).join(', ')} from '${violation.sheet}' without importing it`);
        console.log('    a file imports the sheet whose classes it writes; it is styled today only because another module loads that sheet first');
        console.log(`    not in ${STYLE_BASELINE}, which only shrinks`);
        continue;
      }
      if (violation.kind === 'leaf') {
        console.log(`    imports '${violation.target}' from above it`);
        console.log(`    a leaf of main (${MAIN_LEAVES.join(', ')}) takes what it needs from above as an argument; main/index.ts hands it in`);
        console.log(`    not in ${LEAF_BASELINE}, which only shrinks`);
        continue;
      }
      if (violation.kind === 'layer') {
        console.log(`    imports '${violation.target}' — ${violation.pair}`);
        console.log(
          violation.pair === `features${EDGE_ARROW}features`
            ? '    a feature imports kit and shell, never another feature; what two share belongs below both'
            : '    a layer imports itself and the layers below it (kit, shell, features, entries)',
        );
        console.log(`    not in ${LAYER_BASELINE}, which only shrinks`);
        continue;
      }
      if (violation.kind === 'import') {
        console.log(`    imports '${violation.specifier}' — ${violation.boundary.what}`);
        console.log(
          violation.boundary.polarity === 'confined-to'
            ? `    allowed only under ${violation.boundary.dir}/`
            : `    forbidden from ${violation.boundary.dir}/`,
        );
      } else if (violation.kind === 'source') {
        console.log(`    contains '${violation.token}' — ${violation.boundary.what}`);
      } else {
        console.log(
          `    ${String(violation.extra)} occurrence(s) of ${violation.boundary.what} beyond the grandfathered count`,
        );
        console.log(`    allowed only under ${violation.boundary.allowedDirs.join(' or ')}`);
      }
      console.log(`    because ${violation.boundary.because}`);
    }
    process.exitCode = 1;
  }
}
