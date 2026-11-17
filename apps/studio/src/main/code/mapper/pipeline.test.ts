import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type {
  CodeIdentifyResult,
  CodeMapRequest,
  CodeSearchFileMatches,
  CodeSearchResult,
} from '@studio/events';
import { mapSelection, type MapDeps } from './pipeline.js';
import { readerSource, readingOf } from './reader.js';

/* A real directory: the clamp canonicalises, and on macOS a made-up path under
   /tmp is already a different spelling from its realpath. */
const WORKTREE = realpathSync.native(mkdtempSync(join(tmpdir(), 'studio-mapper-')));

for (const path of [
  'src/Hero.jsx',
  'src/App.jsx',
  'src/Page.jsx',
  'src/legacy/Hero.jsx',
  'src/old/Hero.jsx',
  'node_modules/lib/Hero.js',
  'src/home.html',
  'src/other.html',
]) {
  mkdirSync(dirname(join(WORKTREE, path)), { recursive: true });
  writeFileSync(join(WORKTREE, path), '');
}

afterAll(() => {
  rmSync(WORKTREE, { recursive: true, force: true });
});

const MAP = JSON.stringify({
  version: 3,
  sources: ['src/Hero.jsx'],
  names: [],
  mappings: ';;;;UACI',
});

const MODULE = `//# sourceMappingURL=data:application/json;base64,${Buffer.from(MAP, 'utf8').toString('base64')}`;

const REQUEST: CodeMapRequest = {
  docId: 'doc',
  frameId: 'frame',
  domPath: 'div > h1',
  evidenceId: 'pick-1',
};

function reading(
  over: Partial<{
    component: string | null;
    frames: string[];
    ownerFrames: string[];
    siblings: number;
    react: 'development' | 'production' | 'none';
    evidence: { tag: string; classes: string[]; text: string };
  }> = {},
): CodeIdentifyResult {
  return {
    ok: true,
    reading: {
      ok: true,
      component: 'Hero',
      frames: ['at Hero (http://localhost:5319/src/Hero.jsx:5:11)'],
      ownerFrames: [],
      siblings: 1,
      siblingsComplete: true,
      react: 'development',
      ...over,
    },
  };
}

function searchResult(...files: CodeSearchFileMatches[]): CodeSearchResult {
  return { ok: true, names: [], contents: files, truncated: false };
}

function file(path: string, ...texts: string[]): CodeSearchFileMatches {
  return {
    path,
    lines: texts.map((text, index) => ({ line: index + 1, text, column: 0 })),
    total: texts.length,
  };
}

function deps(over: Partial<MapDeps> = {}): MapDeps {
  return {
    worktree: WORKTREE,
    identify: async () => reading(),
    fetchText: async () => MODULE,
    search: () => searchResult(),
    ...over,
  };
}

describe('across-instance and DOM-evidence mapping', () => {
  it('declines error-document evidence that matches only a generic root tag', async () => {
    const answer = await mapSelection(deps({
      identify: async () => reading({ react: 'none', component: null, frames: [], evidence: { tag: 'html', classes: [], text: 'HTTPError 500: fixture failure' } }),
      search: () => searchResult(file('src/App.jsx', 'function RootDocument() { return <html><body><Outlet /></body></html>; }')),
    }), REQUEST);
    expect(answer.ok).toBe(false);
  });
  it('keeps a named component declaration ahead of unrelated generic DOM matches', async () => {
    const answer = await mapSelection(deps({
      identify: async () => reading({ component: 'Markdown', frames: [], evidence: { tag: 'div', classes: [], text: 'new' } }),
      search: (query) => query === 'Markdown'
        ? searchResult(file('src/Hero.jsx', 'export function Markdown() {'))
        : searchResult(file('src/App.jsx', 'const inject = "<div>new</div>";'), file('src/Page.jsx', 'const guest = "<div>new</div>";')),
    }), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/Hero.jsx', via: 'name-search', grade: 'likely', others: [] } });
  });
  it('preserves best-guess uncertainty when several named declarations survive DOM evidence', async () => {
    const answer = await mapSelection(deps({
      identify: async () => reading({ frames: [], evidence: { tag: 'div', classes: [], text: 'new' } }),
      search: (query) => query === 'Hero'
        ? searchResult(file('src/Hero.jsx', 'export function Hero() {'), file('src/legacy/Hero.jsx', 'export function Hero() {'))
        : searchResult(file('src/App.jsx', 'const inject = "<div>new</div>";')),
    }), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/Hero.jsx', via: 'name-search', grade: 'best-guess',
      others: [{ path: 'src/legacy/Hero.jsx', via: 'name-search' }] } });
  });
  it('keeps one Hero exact with no invented reach from unrelated div ancestors', async () => {
    const fragment: Record<string, unknown> = { return: null };
    const first: Record<string, unknown> = { type: 'div', return: fragment, _debugStack: 'at App (http://localhost:5319/src/App.jsx:20:3)' };
    const second: Record<string, unknown> = { type: 'div', return: fragment, _debugStack: 'at App (http://localhost:5319/src/App.jsx:30:3)' };
    const hero: Record<string, unknown> = { type: function Hero() { return null; }, return: first };
    const footer: Record<string, unknown> = { type: function Footer() { return null; }, return: second };
    const heading = { type: 'h1', return: hero, _debugStack: 'at Hero (http://localhost:5319/src/Hero.jsx:5:11)' };
    const foot = { type: 'footer', return: footer, _debugStack: 'at Footer (http://localhost:5319/src/Page.jsx:5:11)' };
    fragment['child'] = first;
    first['sibling'] = second;
    first['child'] = hero;
    second['child'] = footer;
    hero['child'] = heading;
    footer['child'] = foot;
    const source = readerSource('h1');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const run = new Function('document', `return ${source}`) as (document: unknown) => unknown;
    const identified: CodeIdentifyResult = { ok: true, reading: readingOf(run({ querySelector: () => ({ __reactFiber$test: heading }) })) };
    expect(identified).toMatchObject({ reading: { component: 'Hero', siblings: 1 } });
    const result = await mapSelection(deps({ identify: async () => identified }), REQUEST);
    expect(result).toMatchObject({ ok: true, mapping: { grade: 'exact', produced: 1 } });
  });

  it('verifies every single-li Row instance and reports the repeated reach separately', async () => {
    const Row = function Row() { return null; };
    const parent: Record<string, unknown> = { type: 'ul', return: null };
    const rows = [1, 2, 3, 4].map(() => ({ type: Row, return: parent, child: null as unknown, sibling: null as unknown }));
    const hosts = rows.map((row) => ({ type: 'li', return: row, _debugStack: 'at Row (http://localhost:5319/src/Hero.jsx:5:11)' }));
    rows.forEach((row, index) => { row.child = hosts[index]; row.sibling = rows[index + 1] ?? null; });
    parent['child'] = rows[0];
    const source = readerSource('li');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const run = new Function('document', `return ${source}`) as (document: unknown) => unknown;
    for (const host of hosts) {
      const identified: CodeIdentifyResult = { ok: true, reading: readingOf(run({ querySelector: () => ({ __reactFiber$test: host }) })) };
      const result = await mapSelection(deps({ identify: async () => identified }), REQUEST);
      expect(result).toMatchObject({ ok: true, mapping: { grade: 'exact', produced: 4 } });
    }
  });

  for (const react of ['none', 'development'] as const) {
    it(`searches tag/classes/text for ${react} with an incomplete stack and labels guesses honestly`, async () => {
      const searches: string[] = [];
      const answer = await mapSelection(deps({
        identify: async () => reading({ react, component: null, frames: [], evidence: { tag: 'h1', classes: ['hero-title'], text: 'Welcome home' } }),
        search: (query) => { searches.push(query); return searchResult(file('src/home.html', '<h1 class="hero-title">Welcome home</h1>'), file('src/other.html', '<h1 class="hero-title">Elsewhere</h1>')); },
      }), REQUEST);
      expect(searches).toEqual(['Welcome home', 'hero-title', 'h1']);
      expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/home.html', via: 'element-search', grade: 'best-guess', component: null, definition: null, others: [{ path: 'src/other.html', via: 'element-search' }] } });
    });
  }

  it('keeps a single evidence candidate a best guess and clamps excluded results', async () => {
    const answer = await mapSelection(deps({
      identify: async () => reading({ react: 'none', component: null, frames: [], evidence: { tag: 'h1', classes: [], text: 'Welcome' } }),
      search: () => searchResult(file('src/home.html', '<h1>Welcome</h1>'), file('node_modules/lib/Hero.js', '<h1>Welcome</h1>'), file('../escape.html', '<h1>Welcome</h1>')),
    }), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/home.html', grade: 'best-guess', others: [] } });
  });
});

describe('placing a selection in the project’s own code (ONL-2563)', () => {
  it('resolves the owner stack through the map and calls one line in one file exact', async () => {
    const answer = await mapSelection(deps(), REQUEST);
    expect(answer).toEqual({
      ok: true,
      mapping: {
        path: 'src/Hero.jsx',
        line: 2,
        column: 5,
        via: 'owner-stack',
        definition: null,
        grade: 'exact',
        component: 'Hero',
        others: [],
        uses: 0,
        produced: 1,
        producedComplete: true,
      },
    });
  });

  it('takes the nearest frame that lands in the project, not the first frame', async () => {
    const answer = await mapSelection(
      deps({
        identify: async () =>
          reading({
            frames: [
              'at Wrapper (http://localhost:5319/node_modules/.vite/deps/lib.js:5:11)',
              'at Hero (http://localhost:5319/src/Hero.jsx:5:11)',
            ],
          }),
        fetchText: async (url) =>
          url.includes('node_modules')
            ? `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
                JSON.stringify({
                  version: 3,
                  sources: ['node_modules/lib/src/Thing.js'],
                  names: [],
                  mappings: ';;;;UACI',
                }),
                'utf8',
              ).toString('base64')}`
            : MODULE,
      }),
      REQUEST,
    );
    expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/Hero.jsx' } });
  });

  it('keeps a repeated element source exact and reports its reach separately', async () => {
    const answer = await mapSelection(deps({ identify: async () => reading({ siblings: 4 }) }), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { grade: 'exact', produced: 4 } });
  });

  it('keeps an element source exact when the reach scan is incomplete', async () => {
    const answer = await mapSelection(deps({ identify: async () => ({ ok: true, reading: {
      ok: true, react: 'development', component: 'Hero', frames: ['at Hero (src/Hero.jsx:2:5)'],
      ownerFrames: [], siblings: 2, siblingsComplete: false,
    } }) }), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { grade: 'exact', produced: 2, producedComplete: false } });
  });

  it('labels a parent stack as a component call site, never as the element source', async () => {
    const answer = await mapSelection(deps({ identify: async () => ({ ok: true, reading: {
      ok: true, react: 'development', component: 'Hero', frames: ['at App (src/Hero.jsx:2:5)'],
      direct: false, ownerFrames: [], siblings: 1, siblingsComplete: false,
    } }) }), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { via: 'component-stack', grade: 'likely' } });
  });

  it('softens a mapping whose buffer the panel says has moved, and keeps the place', async () => {
    const answer = await mapSelection(deps(), { ...REQUEST, movedPaths: ['src/Hero.jsx'] });
    expect(answer).toMatchObject({
      ok: true,
      mapping: { grade: 'likely', path: 'src/Hero.jsx', line: 2 },
    });
  });

  it('leaves a mapping alone when some other file has moved', async () => {
    const answer = await mapSelection(deps(), { ...REQUEST, movedPaths: ['src/App.jsx'] });
    expect(answer).toMatchObject({ ok: true, mapping: { grade: 'exact' } });
  });
});

/* Measured against a real styled-components project: every element a styled wrapper draws is
   created inside the dependency, so the element's own stack never lands in the project (ONL-2563). */
describe('an element a dependency drew', () => {
  const DEPENDENCY = 'at styled (http://localhost:5319/node_modules/.vite/deps/styled-components.js:5:11)';
  const libMap = `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
    JSON.stringify({ version: 3, sources: ['node_modules/lib/src/Thing.js'], names: [], mappings: ';;;;UACI' }),
    'utf8',
  ).toString('base64')}`;
  const drawnByLib = {
    identify: async (): Promise<CodeIdentifyResult> =>
      reading({
        component: 'styled.section',
        frames: [DEPENDENCY],
        ownerFrames: ['at Hero (http://localhost:5319/src/Hero.jsx:5:11)'],
      }),
    fetchText: async (url: string) => (url.includes('node_modules') ? libMap : MODULE),
  };

  it('places it at the line in the project that draws that component', async () => {
    const answer = await mapSelection(deps(drawnByLib), REQUEST);
    expect(answer).toMatchObject({
      ok: true,
      mapping: { path: 'src/Hero.jsx', line: 2, via: 'component-stack' },
    });
  });

  /* It is the component's line, not the element's: calling that exact would claim a line that does
     not draw what was picked. */
  it('never calls that line exact', async () => {
    const answer = await mapSelection(deps(drawnByLib), REQUEST);
    expect(answer).toMatchObject({ ok: true, mapping: { grade: 'likely' } });
  });

  it('declines when nothing above the element lands in the project either', async () => {
    const answer = await mapSelection(
      deps({
        identify: async () =>
          reading({ component: null, frames: [DEPENDENCY], ownerFrames: [DEPENDENCY] }),
        fetchText: async () => libMap,
      }),
      REQUEST,
    );
    expect(answer).toEqual({ ok: false, decline: 'unmapped' });
  });

  it('prefers a source-mapped component call site over ambiguous name matches', async () => {
    const answer = await mapSelection(
      deps({
        ...drawnByLib,
        identify: async () =>
          reading({
            component: 'Hero',
            frames: [DEPENDENCY],
            ownerFrames: ['at Hero (http://localhost:5319/src/Hero.jsx:5:11)'],
          }),
        search: () =>
          searchResult(
            file('src/Hero.jsx', 'export function Hero() {'),
            file('src/legacy/Hero.jsx', 'export function Hero() {'),
          ),
      }),
      REQUEST,
    );
    expect(answer).toMatchObject({
      ok: true,
      mapping: { path: 'src/Hero.jsx', via: 'component-stack', grade: 'likely', others: [] },
    });
    if (!answer.ok) throw new Error('expected a mapping');
    expect(answer.mapping.others).toEqual([]);
  });

  // The element's own stack is the answer whenever it has one; the owners are a fallback.
  it('prefers the element’s own line when it has one', async () => {
    const answer = await mapSelection(
      deps({
        identify: async () =>
          reading({ ownerFrames: ['at App (http://localhost:5319/src/App.jsx:9:3)'] }),
      }),
      REQUEST,
    );
    expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/Hero.jsx', grade: 'exact' } });
  });
});

describe('falling back to the component’s name', () => {
  const noStack = { identify: async (): Promise<CodeIdentifyResult> => reading({ frames: [] }) };

  it('finds the declaration and never calls it exact', async () => {
    const answer = await mapSelection(
      deps({ ...noStack, search: () => searchResult(file('src/Hero.jsx', 'export function Hero() {')) }),
      REQUEST,
    );
    expect(answer).toMatchObject({
      ok: true,
      mapping: { path: 'src/Hero.jsx', line: 1, via: 'name-search', grade: 'likely', others: [] },
    });
  });

  it('calls several declarations a best guess and offers the others', async () => {
    const answer = await mapSelection(
      deps({
        ...noStack,
        search: () =>
          searchResult(
            file('src/Hero.jsx', 'function Hero() {'),
            file('src/legacy/Hero.jsx', 'function Hero() {'),
            file('src/old/Hero.jsx', 'function Hero() {'),
          ),
      }),
      REQUEST,
    );
    if (!answer.ok) throw new Error('expected a mapping');
    expect(answer.mapping.grade).toBe('best-guess');
    expect(answer.mapping.others.map((other) => other.path)).toEqual([
      'src/legacy/Hero.jsx',
      'src/old/Hero.jsx',
    ]);
  });

  it('declines rather than guessing when nothing at all places it', async () => {
    expect(await mapSelection(deps(noStack), REQUEST)).toEqual({ ok: false, decline: 'unmapped' });
  });

  it('declines when the only name match is outside the worktree', async () => {
    const answer = await mapSelection(
      deps({
        ...noStack,
        search: () => searchResult(file('../elsewhere/Hero.jsx', 'function Hero() {')),
      }),
      REQUEST,
    );
    expect(answer).toEqual({ ok: false, decline: 'unmapped' });
  });

  it('does not search for a host element with no component name', async () => {
    let searched = false;
    const answer = await mapSelection(
      deps({
        identify: async () => reading({ component: null, frames: [] }),
        search: () => {
          searched = true;
          return searchResult();
        },
      }),
      REQUEST,
    );
    expect(searched).toBe(false);
    expect(answer).toEqual({ ok: false, decline: 'unmapped' });
  });
});

describe('what the designer is warned about before editing', () => {
  /* The warning that an edit reaches every use must be there on the strongest
     mapping too, not only on a fallback (ONL-2563). */
  it('counts the component’s other uses even when the owner stack placed it', async () => {
    const answer = await mapSelection(
      deps({
        search: () =>
          searchResult(
            file('src/Hero.jsx', 'function Hero() {'),
            file('src/App.jsx', '<Hero />'),
            file('src/Page.jsx', '<Hero title="x" />'),
          ),
      }),
      REQUEST,
    );
    expect(answer).toMatchObject({ ok: true, mapping: { grade: 'exact', uses: 2 } });
  });

  it('keeps a search refusal from costing the mapping', async () => {
    const answer = await mapSelection(
      deps({ search: () => ({ ok: false, code: 'no-project' }) }),
      REQUEST,
    );
    expect(answer).toMatchObject({ ok: true, mapping: { path: 'src/Hero.jsx', uses: 0 } });
  });
});

describe('declining', () => {
  it('passes an identify decline through unchanged', async () => {
    expect(
      await mapSelection(deps({ identify: async () => ({ ok: false, decline: 'attachment-unavailable' }) }), REQUEST),
    ).toEqual({ ok: false, decline: 'attachment-unavailable' });
  });

  it('names a frame with no React, which is a project shape rather than a fault', async () => {
    expect(
      await mapSelection(deps({ identify: async () => ({ ok: true, reading: { ok: false, why: 'no-react' } }) }), REQUEST),
    ).toEqual({ ok: false, decline: 'no-react' });
  });

  it('names a selection that matches nothing', async () => {
    expect(
      await mapSelection(deps({ identify: async () => ({ ok: true, reading: { ok: false, why: 'no-element' } }) }), REQUEST),
    ).toEqual({ ok: false, decline: 'no-element' });
  });

  it('turns the page’s unreadable answer into a failure, not into one of its own reasons', async () => {
    expect(
      await mapSelection(deps({ identify: async () => ({ ok: true, reading: { ok: false, why: 'unreadable' } }) }), REQUEST),
    ).toEqual({ ok: false, decline: 'failed' });
  });

  it('declines with no Project rather than resolving against nothing', async () => {
    expect(await mapSelection(deps({ worktree: undefined }), REQUEST)).toEqual({
      ok: false,
      decline: 'unaddressable',
    });
  });

  /* The clamp is the security line: a map whose `sources` names a path outside
     the project is page content, and following it would read the user's disk. */
  it('refuses a mapped source that escapes the worktree', async () => {
    const escaping = `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
      JSON.stringify({
        version: 3,
        sources: ['../../../../etc/passwd'],
        names: [],
        mappings: ';;;;UACI',
      }),
      'utf8',
    ).toString('base64')}`;
    expect(
      await mapSelection(deps({ fetchText: async () => escaping, search: () => searchResult() }), REQUEST),
    ).toEqual({ ok: false, decline: 'unmapped' });
  });

  it('refuses a mapped source inside a dependency, which is not what the designer writes', async () => {
    const dependency = `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
      JSON.stringify({
        version: 3,
        sources: ['node_modules/lib/Hero.js'],
        names: [],
        mappings: ';;;;UACI',
      }),
      'utf8',
    ).toString('base64')}`;
    expect(
      await mapSelection(deps({ fetchText: async () => dependency, search: () => searchResult() }), REQUEST),
    ).toEqual({ ok: false, decline: 'unmapped' });
  });

  it('refuses a mapped source that no longer exists on disk', async () => {
    expect(await mapSelection(deps({ exists: () => false, search: () => searchResult() }), REQUEST)).toEqual({
      ok: false,
      decline: 'unmapped',
    });
  });
});

describe('where the component is declared (ONL-2563)', () => {
  /* Open component and Open element are two verbs because they are two answers:
     the element's position is not the component's declaration. */
  it('names the declaration beside the element’s own position', async () => {
    const answer = await mapSelection(
      deps({
        search: () =>
          searchResult(
            file('src/Hero.jsx', 'export function Hero() {'),
            file('src/App.jsx', '<Hero />'),
          ),
      }),
      REQUEST,
    );
    if (!answer.ok) throw new Error('expected a mapping');
    expect(answer.mapping.line).toBe(2);
    expect(answer.mapping.definition).toEqual({
      path: 'src/Hero.jsx',
      line: 1,
      column: 1,
      via: 'name-search',
    });
  });

  it('names no declaration for a host element with no component', async () => {
    const answer = await mapSelection(
      deps({ identify: async () => reading({ component: null }) }),
      REQUEST,
    );
    if (!answer.ok) throw new Error('expected a mapping');
    expect(answer.mapping.definition).toBeNull();
  });

  /* A control ships when it acts: with nothing declaring the name in the project,
     Open component has nowhere to go and the menu leaves it out. */
  it('names no declaration when the project declares the name nowhere', async () => {
    const answer = await mapSelection(deps({ search: () => searchResult() }), REQUEST);
    if (!answer.ok) throw new Error('expected a mapping');
    expect(answer.mapping.definition).toBeNull();
  });

  it('prefers the best-ranked declaration when several files declare it', async () => {
    const answer = await mapSelection(
      deps({
        search: () =>
          searchResult(
            file('src/legacy/Hero.jsx', 'function Hero() {'),
            file('src/Hero.jsx', 'function Hero() {'),
          ),
      }),
      REQUEST,
    );
    if (!answer.ok) throw new Error('expected a mapping');
    expect(answer.mapping.definition?.path).toBe('src/Hero.jsx');
  });
});

describe('a frame running a production build (ONL-2563)', () => {
  /* Production React carries no owner stack and MINIFIES the component's name, so a name search
     there matches a declaration that has nothing to do with the element. */
  it('refuses to answer from a name search', async () => {
    const result = await mapSelection(
      {
        worktree: '/w',
        identify: () => Promise.resolve(reading({ component: 'ed', frames: [], react: 'production' })),
        fetchText: () => Promise.resolve(null),
        search: () => ({
          ok: true,
          contents: [{ path: 'src/Hero.jsx', lines: [{ line: 2, text: 'const ed = React.memo(', column: 0 }], total: 1 }],
          names: [],
          truncated: false,
        }),
        exists: () => true,
      },
      REQUEST,
    );
    expect(result).toEqual({ ok: false, decline: 'unmapped' });
  });

});
