import { describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkImports, classesWritten, LAYER_BASELINE, LEAF_BASELINE, sheetClasses, STYLE_BASELINE } from './check-imports.js';

const INSIDE = 'apps/studio/src/main/agent-host/session.ts';
const OUTSIDE = 'apps/studio/src/renderer/src/chat/x.ts';
const CANVAS_SHELL = 'apps/studio/src/renderer/src/canvas/Canvas.tsx';

function scanOneFile(relativePath: string, source: string, scanRoots: string[] = ['apps']) {
  const root = mkdtempSync(join(tmpdir(), 'check-imports-'));
  try {
    const abs = join(root, relativePath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, source);
    return checkImports({ root, scanRoots });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// Every forbidden specifier is assembled at runtime: written literally, this file trips the lint it tests.
const ANTHROPIC_SDK = `@anthropic-${'ai'}/claude-agent-sdk`;

const SDK_IMPORT = `import { query } from '${ANTHROPIC_SDK}';\nexport const q = query;\n`;

describe('the boundary is enforced', () => {
  it('FAILS on an SDK import outside the agent host', () => {
    const { violations } = scanOneFile(OUTSIDE, SDK_IMPORT);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.file).toBe(OUTSIDE);
    expect(violations[0]?.kind === 'import' ? violations[0].specifier : null).toBe(ANTHROPIC_SDK);
    const violation = violations[0];
    expect(violation?.kind === 'import' ? violation.boundary.dir : null).toBe(
      'apps/studio/src/main/agent-host',
    );
  });

  it('PASSES on the identical import inside the agent host', () => {
    const { violations } = scanOneFile(INSIDE, SDK_IMPORT);
    expect(violations).toEqual([]);
  });

  it('does not let a sibling directory borrow the allowance', () => {
    const { violations } = scanOneFile(
      'apps/studio/src/main/agent-host-extra/session.ts',
      SDK_IMPORT,
    );
    expect(violations).toHaveLength(1);
  });

  it('reads dynamic and require specifiers, not just static imports', () => {
    const dynamic = `export const load = () => import('${ANTHROPIC_SDK}');\n`;
    expect(scanOneFile(OUTSIDE, dynamic).violations).toHaveLength(1);
    const required = `const h = require('${ANTHROPIC_SDK}/tools');\nexport default h;\n`;
    expect(scanOneFile(OUTSIDE, required).violations).toHaveLength(1);
  });

  it('ignores specifiers that merely start with the same letters', () => {
    const near = `import x from '${ANTHROPIC_SDK}-extra';\nimport y from '@anthropic-${'ai'}/sdk';\nexport const z = [x, y];\n`;
    expect(scanOneFile(OUTSIDE, near).violations).toEqual([]);
  });

  it('FAILS when editor code imports the provider API, and passes for its own suite', () => {
    const source = `export { stateRoot } from './provider-${'api'}.js';\n`;
    const inside = scanOneFile('apps/studio/src/main/cloud/index.ts', source);
    expect(inside.violations).toHaveLength(1);
    expect(inside.violations[0]?.kind === 'import' ? inside.violations[0].boundary.what : null).toContain('provider API');
    const aliased = `import { stateRoot } from '@studio/main/cloud/provider-${'api'}';\nexport const root = stateRoot;\n`;
    expect(scanOneFile('apps/studio/src/main/tabs/host.ts', aliased).violations).toHaveLength(1);
    expect(scanOneFile('apps/studio/src/main/cloud/provider-api.test.ts', source).violations).toEqual([]);
    expect(scanOneFile('apps/studio/src/main/cloud/index.ts', `export * from './provider-${'api'}-notes.js';\n`).violations).toEqual([]);
  });

  it('FAILS when the canvas shell owns a direct React effect', () => {
    const forbidden = `import { use${'Effect'} } from 'react';\nexport const Canvas = () => null;\n`;
    const { violations } = scanOneFile(CANVAS_SHELL, forbidden);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.file).toBe(CANVAS_SHELL);
    expect(violations[0]?.kind === 'source' ? violations[0].token : null).toBe(
      `use${'Effect'}`,
    );
  });

  it('PASSES when the canvas shell composes a purpose-owned hook', () => {
    const source = `import { useCanvasCameraSync } from './useCanvasCameraSync.js';\nexport const Canvas = () => useCanvasCameraSync();\n`;
    expect(scanOneFile(CANVAS_SHELL, source).violations).toEqual([]);
  });
});

const GIT_UI_FILE = 'packages/git-ui/src/GitStatusPill.tsx';
const MAIN_IMPORT = `import { x } from '../../../apps/studio/${'src'}/main/index.js';\nexport const y = x;\n`;

const GET_ALL_WINDOWS_CALL = `BrowserWindow.${'getAllWindows'}()`;
const FROM_WEB_CONTENTS_CALL = `BrowserWindow.${'fromWebContents'}(sender)`;

describe('the token boundary is enforced (ONL-2226)', () => {
  it('FAILS on a getAllWindows() call outside the allowed dirs and off the grandfather list', () => {
    const source = `export function f() { return ${GET_ALL_WINDOWS_CALL}; }\n`;
    const { violations } = scanOneFile('apps/studio/src/main/frames/other.ts', source);

    expect(violations).toHaveLength(1);
    const violation = violations[0];
    expect(violation?.kind).toBe('token');
    expect(violation?.kind === 'token' ? violation.extra : null).toBe(1);
  });

  it('PASSES on the identical call inside main/tabs/', () => {
    const source = `export function f() { return ${GET_ALL_WINDOWS_CALL}; }\n`;
    expect(scanOneFile('apps/studio/src/main/tabs/broadcast.ts', source).violations).toEqual([]);
  });

  it('FAILS on a fromWebContents() call outside the allowed dirs', () => {
    const source = `export function f(sender: unknown) { return ${FROM_WEB_CONTENTS_CALL}; }\n`;
    const { violations } = scanOneFile('apps/studio/src/main/frames/other.ts', source);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind === 'token' ? violations[0].boundary.what : null).toContain(
      'fromWebContents',
    );
  });

  it('PASSES on the identical fromWebContents() call inside main/window/', () => {
    const source = `export function f(sender: unknown) { return ${FROM_WEB_CONTENTS_CALL}; }\n`;
    expect(scanOneFile('apps/studio/src/main/window/host.ts', source).violations).toEqual([]);
  });
});

const CONSOLE_CALL = `${'con' + 'sole'}.log('x')`;

describe('the console boundary is enforced (ONL-2347)', () => {
  it('FAILS on a bare console call in product source', () => {
    const { violations } = scanOneFile('apps/studio/src/main/frames/other.ts', `export function f() { ${CONSOLE_CALL}; }\n`);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind === 'token' ? violations[0].boundary.what : null).toContain('console');
  });

  it('PASSES in a suite, in main/log/, and on a data field named console', () => {
    expect(scanOneFile('apps/studio/src/main/frames/other.test.ts', `${CONSOLE_CALL};\n`).violations).toEqual([]);
    expect(scanOneFile('apps/studio/src/main/log/index.ts', `${CONSOLE_CALL};\n`).violations).toEqual([]);
    expect(scanOneFile('apps/studio/src/main/canvas/mirror.ts', `entry.${'con' + 'sole'}.push(line);\n`).violations).toEqual([]);
  });
});

describe('the forbidden-from boundary is enforced', () => {
  it('FAILS on a main-process import inside packages/git-ui', () => {
    const { violations } = scanOneFile(GIT_UI_FILE, MAIN_IMPORT, ['packages']);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind === 'import' ? violations[0].boundary.polarity : null).toBe('forbidden-from');
    expect(violations[0]?.kind === 'import' ? violations[0].boundary.dir : null).toBe('packages/git-ui');
  });

  it('PASSES on the identical import outside packages/git-ui', () => {
    const { violations } = scanOneFile('packages/chat-ui/src/x.ts', MAIN_IMPORT, ['packages']);
    expect(violations).toEqual([]);
  });
});

const SRC = 'apps/studio/src/renderer/src';
const CANVAS_STORE = `${SRC}/canvas/store.ts`;
const CHAT_FILE = `${SRC}/chat/Composer.tsx`;
const CHAT_TO_CANVAS = `${CHAT_FILE} → ${CANVAS_STORE}`;
const EXPORT = 'export const x = 1;\n';
const importing = (specifier: string): string => `import { x } from '${specifier}';\nexport const y = x;\n`;

function scanFiles(files: Record<string, string>, layerBaseline: readonly string[] = [], scanRoots: string[] = ['apps']) {
  const root = mkdtempSync(join(tmpdir(), 'check-imports-'));
  try {
    for (const [relativePath, source] of Object.entries(files)) {
      const abs = join(root, relativePath);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, source);
    }
    return checkImports({ root, scanRoots, layerBaseline });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('the renderer layers are enforced', () => {
  it('FAILS on a new import from one feature into another', () => {
    const { violations } = scanFiles({ [CANVAS_STORE]: EXPORT, [CHAT_FILE]: importing('../canvas/store.js') });

    expect(violations).toHaveLength(1);
    const violation = violations[0];
    expect(violation?.kind === 'layer' ? violation.edge : null).toBe(CHAT_TO_CANVAS);
    expect(violation?.kind === 'layer' ? violation.pair : null).toBe('features → features');
  });

  it('FAILS on a new import from a lower layer into a higher one', () => {
    const kit = scanFiles({ [CANVAS_STORE]: EXPORT, [`${SRC}/menu/surface.tsx`]: importing('../canvas/store.js') });
    expect(kit.violations.map((v) => (v.kind === 'layer' ? v.pair : v.kind))).toEqual(['kit → features']);

    const shell = scanFiles({ [CANVAS_STORE]: EXPORT, [`${SRC}/rail/Rail.tsx`]: importing('@renderer/canvas/store.js') });
    expect(shell.violations.map((v) => (v.kind === 'layer' ? v.pair : v.kind))).toEqual(['shell → features']);

    const pure = scanFiles(
      { [CANVAS_STORE]: EXPORT, 'packages/chat-ui/src/Row.tsx': importing(`../../../${SRC}/canvas/store.js`) },
      [],
      ['apps', 'packages'],
    );
    expect(pure.violations.map((v) => (v.kind === 'layer' ? v.pair : v.kind))).toEqual(['kit → features']);
  });

  it('PASSES on imports downward, inside one folder, and from an entry', () => {
    const { violations, layerEdges } = scanFiles(
      {
        [CANVAS_STORE]: EXPORT,
        [`${SRC}/menu/surface.tsx`]: EXPORT,
        [`${SRC}/rail/Rail.tsx`]: EXPORT,
        'packages/chat-ui/src/index.ts': EXPORT,
        [`${SRC}/canvas/Canvas.tsx`]: [
          importing('./store.js'),
          importing('../menu/surface.js'),
          importing('../rail/Rail.js'),
          importing('@studio/chat-ui'),
        ].join(''),
        [`${SRC}/dev/Showroom.tsx`]: importing('../canvas/store.js'),
        [`${SRC}/Root.tsx`]: importing('./canvas/store.js'),
        [`${SRC}/main.tsx`]: importing('./Root.js'),
      },
      [],
      ['apps', 'packages'],
    );
    expect(violations).toEqual([]);
    expect(layerEdges).toEqual([]);
  });

  it("gives a file its own row ahead of its folder's", () => {
    const { violations } = scanFiles({
      [`${SRC}/chrome/entry.tsx`]: importing('../tips/content.js'),
      [`${SRC}/tips/content.ts`]: EXPORT,
      [`${SRC}/chrome/TopBar.tsx`]: importing('./entry.js'),
    });
    expect(violations.map((v) => (v.kind === 'layer' ? v.edge : v.kind))).toEqual([
      `${SRC}/chrome/TopBar.tsx → ${SRC}/chrome/entry.tsx`,
    ]);
  });

  it('leaves a suite free to import across layers', () => {
    const { violations } = scanFiles({ [CANVAS_STORE]: EXPORT, [`${SRC}/chat/Composer.test.tsx`]: importing('../canvas/store.js') });
    expect(violations).toEqual([]);
  });

  it('FAILS on a renderer folder that has no layer', () => {
    const { violations } = scanFiles({ [`${SRC}/brand-new/a.ts`]: EXPORT, [`${SRC}/brand-new/b.ts`]: EXPORT });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind === 'unassigned' ? violations[0].row : null).toBe('brand-new');
  });
});

describe('the layer baseline is a ratchet', () => {
  it('PASSES on a baselined import, and still reports it as a breach', () => {
    const { violations, layerEdges } = scanFiles(
      { [CANVAS_STORE]: EXPORT, [CHAT_FILE]: importing('../canvas/store.js') },
      [CHAT_TO_CANVAS],
    );
    expect(violations).toEqual([]);
    expect(layerEdges.map((entry) => entry.edge)).toEqual([CHAT_TO_CANVAS]);
  });

  it('FAILS on a second import beside a baselined one', () => {
    const { violations } = scanFiles(
      {
        [CANVAS_STORE]: EXPORT,
        [`${SRC}/canvas/model.ts`]: EXPORT,
        [CHAT_FILE]: `${importing('../canvas/store.js')}export { x as z } from '../canvas/model.js';\n`,
      },
      [CHAT_TO_CANVAS],
    );
    expect(violations.map((v) => (v.kind === 'layer' ? v.edge : v.kind))).toEqual([
      `${CHAT_FILE} → ${SRC}/canvas/model.ts`,
    ]);
  });

  it('FAILS on a baseline line whose import is gone', () => {
    const { violations } = scanFiles({ [CANVAS_STORE]: EXPORT, [CHAT_FILE]: EXPORT }, [CHAT_TO_CANVAS]);
    expect(violations).toEqual([{ kind: 'stale', file: LAYER_BASELINE, edge: CHAT_TO_CANVAS }]);
  });

  it('keeps the checked-in baseline sorted, one import per line', () => {
    const lines = readFileSync(join(import.meta.dirname, '..', LAYER_BASELINE), 'utf8').split('\n');
    expect(lines.pop()).toBe('');
    expect(lines).toEqual([...new Set(lines)].sort());
    for (const line of lines) expect(line).toMatch(/^\S+ → \S+$/);
  });
});

const MAIN = 'apps/studio/src/main';
const STATE_STORE = `${MAIN}/state/store.ts`;
const LOG_INDEX = `${MAIN}/log/index.ts`;
const BRIDGE = `${MAIN}/ipc/bridge.ts`;
const LOG_TO_BRIDGE = `${MAIN}/log/ipc.ts → ${BRIDGE}`;

function scanLeaves(files: Record<string, string>, leafBaseline: readonly string[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'check-imports-'));
  try {
    for (const [relativePath, source] of Object.entries(files)) {
      const abs = join(root, relativePath);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, source);
    }
    return checkImports({ root, scanRoots: ['apps'], leafBaseline });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("main's leaves import nothing above them", () => {
  it('FAILS on a leaf importing a folder above the leaves', () => {
    const { violations } = scanLeaves({ [BRIDGE]: EXPORT, [`${MAIN}/log/ipc.ts`]: importing('../ipc/bridge.js') });
    expect(violations.map((v) => (v.kind === 'leaf' ? v.edge : v.kind))).toEqual([LOG_TO_BRIDGE]);
  });

  it('FAILS on a leaf importing a leaf above it, a type import included', () => {
    const { violations } = scanLeaves({
      [LOG_INDEX]: EXPORT,
      [STATE_STORE]: "import type { x } from '../log/index.js';\nexport type y = typeof x;\n",
    });
    expect(violations.map((v) => (v.kind === 'leaf' ? v.edge : v.kind))).toEqual([`${STATE_STORE} → ${LOG_INDEX}`]);
  });

  it('FAILS on a leaf importing the renderer, and on a base file importing a leaf', () => {
    const { violations } = scanLeaves({
      [`${SRC}/flags/index.ts`]: EXPORT,
      [STATE_STORE]: EXPORT,
      [`${MAIN}/telemetry/index.ts`]: importing('../../renderer/src/flags/index.js'),
      [`${MAIN}/fs-atomic.ts`]: importing('./state/store.js'),
    });
    expect(violations.map((v) => (v.kind === 'leaf' ? v.edge : v.kind)).sort()).toEqual([
      `${MAIN}/fs-atomic.ts → ${STATE_STORE}`,
      `${MAIN}/telemetry/index.ts → ${SRC}/flags/index.ts`,
    ]);
  });

  it('PASSES on a leaf importing the base files, its own folder and the leaves below it', () => {
    const { violations, leafEdges } = scanLeaves({
      [`${MAIN}/env/switch.ts`]: EXPORT,
      [`${MAIN}/state/root.ts`]: importing('../env/switch.js'),
      [STATE_STORE]: importing('./root.js'),
      [LOG_INDEX]: importing('../state/root.js'),
      [`${MAIN}/telemetry/index.ts`]: `${importing('../log/index.js')}export { x as z } from '../state/store.js';\n`,
      [`${MAIN}/errors/index.ts`]: importing('../telemetry/index.js'),
    });
    expect(violations).toEqual([]);
    expect(leafEdges).toEqual([]);
  });

  it("ranks a handler file inside a leaf's folder above the leaves", () => {
    const handlers = `${MAIN}/telemetry/ipc.ts`;
    const above = scanLeaves({ [BRIDGE]: EXPORT, [handlers]: importing('../ipc/bridge.js') });
    expect(above.violations).toEqual([]);
    expect(above.leafEdges).toEqual([]);

    const reached = scanLeaves({ [handlers]: EXPORT, [`${MAIN}/telemetry/index.ts`]: importing('./ipc.js') });
    expect(reached.violations.map((v) => (v.kind === 'leaf' ? v.edge : v.kind))).toEqual([`${MAIN}/telemetry/index.ts → ${handlers}`]);
  });

  it("leaves a leaf's suite free to import from above", () => {
    const { violations } = scanLeaves({ [BRIDGE]: EXPORT, [`${MAIN}/log/ipc.test.ts`]: importing('../ipc/bridge.js') });
    expect(violations).toEqual([]);
  });

  it('holds its baseline as a ratchet', () => {
    const files = { [BRIDGE]: EXPORT, [`${MAIN}/log/ipc.ts`]: importing('../ipc/bridge.js') };
    const baselined = scanLeaves(files, [LOG_TO_BRIDGE]);
    expect(baselined.violations).toEqual([]);
    expect(baselined.leafEdges).toEqual([LOG_TO_BRIDGE]);

    const gone = scanLeaves({ [BRIDGE]: EXPORT, [`${MAIN}/log/ipc.ts`]: EXPORT }, [LOG_TO_BRIDGE]);
    expect(gone.violations).toEqual([{ kind: 'stale', file: LEAF_BASELINE, edge: LOG_TO_BRIDGE }]);
  });

  it('keeps the checked-in baseline sorted, one import per line', () => {
    const lines = readFileSync(join(import.meta.dirname, '..', LEAF_BASELINE), 'utf8').split('\n');
    expect(lines.pop()).toBe('');
    expect(lines).toEqual([...new Set(lines)].sort());
    for (const line of lines) expect(line).toMatch(/^\S+ → \S+$/);
  });
});

const CARD = `${SRC}/projects/Card.tsx`;
const CARD_SHEET = `${SRC}/projects/projects.css`;
const CARD_TO_SHEET = `${CARD} → ${CARD_SHEET}`;
const SHEET = '.project-card { color: red; }\n.project-card:hover .project-card-name { color: blue; }\n';
const writing = (name: string, sheet?: string): string =>
  `${sheet === undefined ? '' : `import '${sheet}';\n`}export const Card = () => <div className="${name}" />;\n`;

function scanStyles(files: Record<string, string>, styleBaseline: readonly string[] = [], scanRoots: string[] = ['apps']) {
  const root = mkdtempSync(join(tmpdir(), 'check-imports-'));
  try {
    for (const [relativePath, source] of Object.entries(files)) {
      const abs = join(root, relativePath);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, source);
    }
    return checkImports({ root, scanRoots, styleBaseline });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('a file imports the sheet whose classes it writes', () => {
  it('FAILS on a class written without its sheet, naming the sheet and the classes', () => {
    const source = 'export const Card = () => <div className="project-card"><b className={`x ${on ? \'project-card-name\' : \'\'}`} /></div>;\n';
    const { violations } = scanStyles({ [CARD_SHEET]: SHEET, [CARD]: source });

    expect(violations).toHaveLength(1);
    const violation = violations[0];
    expect(violation?.kind === 'style' ? violation.edge : null).toBe(CARD_TO_SHEET);
    expect(violation?.kind === 'style' ? violation.classes : null).toEqual(['project-card', 'project-card-name']);
  });

  it('PASSES once the file imports the sheet, by a relative path or the renderer alias', () => {
    expect(scanStyles({ [CARD_SHEET]: SHEET, [CARD]: writing('project-card', './projects.css') }).violations).toEqual([]);
    const aliased = scanStyles({ [CARD_SHEET]: SHEET, [`${SRC}/dev/Gallery.tsx`]: writing('project-card', '@renderer/projects/projects.css') });
    expect(aliased.violations).toEqual([]);
    expect(aliased.styleEdges).toEqual([]);
  });

  it('does not count an import of another sheet, or of the sheet by a file beside it', () => {
    const { violations } = scanStyles({
      [CARD_SHEET]: SHEET,
      [`${SRC}/projects/other.css`]: '.other { color: red; }\n',
      [`${SRC}/projects/List.tsx`]: "import './projects.css';\nexport const List = () => null;\n",
      [CARD]: writing('project-card', './other.css'),
    });
    expect(violations.map((v) => (v.kind === 'style' ? v.edge : v.kind))).toEqual([CARD_TO_SHEET]);
  });

  it('reads a class handed to `className:` and to `classList`', () => {
    const prop = scanStyles({ [CARD_SHEET]: SHEET, [CARD]: "export const props = { className: 'project-card' };\n" });
    expect(prop.styleEdges).toEqual([CARD_TO_SHEET]);
    const list = scanStyles({ [CARD_SHEET]: SHEET, [CARD]: "export const mark = (el: Element) => el.classList.add('project-card');\n" });
    expect(list.styleEdges).toEqual([CARD_TO_SHEET]);
  });

  it('PASSES on a class named in a query, a test id, a comment or a plain string', () => {
    const source = [
      "export const find = (el: Element) => el.querySelector('.project-card');",
      "export const kind = { source: 'project-card' };",
      '// project-card',
      'export const Card = () => <div data-testid="project-card" />;',
      '',
    ].join('\n');
    expect(scanStyles({ [CARD_SHEET]: SHEET, [CARD]: source }).violations).toEqual([]);
  });

  it('leaves the global sheets, a suite and a file outside the renderer alone', () => {
    const { violations } = scanStyles({
      [`${SRC}/styles.css`]: '.app-root { color: red; }\n',
      [`${SRC}/theme/studio.css`]: '.studio-theme { color: red; }\n',
      [CARD_SHEET]: SHEET,
      [CARD]: writing('app-root studio-theme'),
      [`${SRC}/projects/Card.test.tsx`]: writing('project-card'),
      'apps/studio/src/main/starter/page.tsx': writing('project-card'),
    });
    expect(violations).toEqual([]);
  });

  it('takes either sheet for a class two sheets name, and asks for both when neither is imported', () => {
    const fan = `${SRC}/fan/fan.css`;
    const files = { [CARD_SHEET]: SHEET, [fan]: '.project-card { color: green; }\n' };
    expect(scanStyles({ ...files, [CARD]: writing('project-card', '../fan/fan.css') }).violations).toEqual([]);
    expect(scanStyles({ ...files, [CARD]: writing('project-card') }).styleEdges).toEqual([`${CARD} → ${fan}`, CARD_TO_SHEET]);
  });

  it("covers a package's sheet and the files that write its classes", () => {
    const sheet = 'packages/chat-ui/src/chat-ui.css';
    const row = 'packages/chat-ui/src/Row.tsx';
    const files = { [sheet]: '.chat-row { color: red; }\n', [`${SRC}/chat/Region.tsx`]: writing('chat-row') };
    const { violations } = scanStyles({ ...files, [row]: writing('chat-row') }, [], ['apps', 'packages']);
    expect(violations.map((v) => (v.kind === 'style' ? v.edge : v.kind)).sort()).toEqual([
      `${SRC}/chat/Region.tsx → ${sheet}`,
      `${row} → ${sheet}`,
    ]);
    expect(scanStyles({ ...files, [row]: writing('chat-row', './chat-ui.css') }, [`${SRC}/chat/Region.tsx → ${sheet}`], ['apps', 'packages']).violations).toEqual([]);
  });

  it('holds its baseline as a ratchet', () => {
    const files = { [CARD_SHEET]: SHEET, [CARD]: writing('project-card') };
    const baselined = scanStyles(files, [CARD_TO_SHEET]);
    expect(baselined.violations).toEqual([]);
    expect(baselined.styleEdges).toEqual([CARD_TO_SHEET]);

    const second = scanStyles({ ...files, [`${SRC}/projects/Grid.tsx`]: writing('project-card-name') }, [CARD_TO_SHEET]);
    expect(second.violations.map((v) => (v.kind === 'style' ? v.edge : v.kind))).toEqual([`${SRC}/projects/Grid.tsx → ${CARD_SHEET}`]);

    const gone = scanStyles({ [CARD_SHEET]: SHEET, [CARD]: writing('project-card', './projects.css') }, [CARD_TO_SHEET]);
    expect(gone.violations).toEqual([{ kind: 'stale', file: STYLE_BASELINE, edge: CARD_TO_SHEET }]);
  });

  it('keeps the checked-in baseline sorted, one file and sheet per line', () => {
    const lines = readFileSync(join(import.meta.dirname, '..', STYLE_BASELINE), 'utf8').split('\n');
    expect(lines.pop()).toBe('');
    expect(lines).toEqual([...new Set(lines)].sort());
    for (const line of lines) expect(line).toMatch(/^\S+ → \S+\.css$/);
  });
});

describe('reading a sheet and a source file for classes', () => {
  it('takes classes from selectors only', () => {
    const css = [
      '/* .in-a-comment */',
      "@import './other.css' layer(app);",
      '@layer app {',
      "  .card, button.card-action:not(.is-off) > .card-name[data-kind='a.b'] { margin: 0.5em; background: url(./x.png); transition: opacity .2s; }",
      '  @media (min-width: 10.5px) { .card-wide { width: calc(100% - 1.5rem); } }',
      '  @keyframes card-in { from { opacity: 0.5; } 50.5% { opacity: 1; } }',
      '  .card { &.card-open { color: red; } }',
      '}',
    ].join('\n');
    expect([...sheetClasses(css)].sort()).toEqual(['card', 'card-action', 'card-name', 'card-open', 'card-wide', 'is-off']);
  });

  it('takes every word of the literals in a class seat, and nothing after it', () => {
    const source = [
      'const a = <div className="one two" data-testid="not-this" />;',
      "const b = <div className={open ? 'three' : `four ${extra} five`} title='nor-this' />;",
      "const c = { className: 'six', label: 'nor-that' };",
      "el.classList.toggle('seven', on);",
      'interface Props { className: string }',
    ].join('\n');
    expect([...classesWritten(source)].sort()).toEqual(['extra', 'five', 'four', 'one', 'seven', 'six', 'three', 'two']);
  });
});
