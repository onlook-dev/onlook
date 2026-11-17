import { describe, expect, it } from 'bun:test';
import {
  inlineMapOf,
  mapCommentOf,
  originalPositionOf,
  resolveThroughMap,
  sidecarUrlOf,
  sourcePathOf,
  sourceSpellings,
} from './sources.js';

/* Generated line 5, column 10 maps to source line 2, column 4. Written out
   rather than generated, so the test does not depend on the library it checks. */
const MAP = JSON.stringify({
  version: 3,
  sources: ['src/Hero.jsx'],
  names: [],
  mappings: ';;;;UACI',
});

describe('finding the map a served module names (ONL-2563)', () => {
  it('reads the comment at the foot of a module', () => {
    expect(mapCommentOf('const a = 1\n//# sourceMappingURL=hero.js.map\n')).toBe('hero.js.map');
  });

  it('reads the block-comment spelling', () => {
    expect(mapCommentOf('const a = 1\n/*# sourceMappingURL=hero.js.map */')).toBe('hero.js.map');
  });

  /* A bundle carries its modules' own comments inside it; the one that
     describes the served file is the last. */
  it('takes the last comment, not the first', () => {
    expect(mapCommentOf('//# sourceMappingURL=inner.map\ncode\n//# sourceMappingURL=outer.map')).toBe(
      'outer.map',
    );
  });

  it('answers nothing for a module with no map', () => {
    expect(mapCommentOf('export const a = 1\n')).toBeNull();
  });
});

describe('the inline map Vite dev rides on the module', () => {
  it('decodes a base64 data url', () => {
    const comment = `data:application/json;base64,${Buffer.from(MAP, 'utf8').toString('base64')}`;
    expect(inlineMapOf(comment)).toBe(MAP);
  });

  it('decodes the charset spelling', () => {
    const comment = `data:application/json;charset=utf-8;base64,${Buffer.from('{}', 'utf8').toString('base64')}`;
    expect(inlineMapOf(comment)).toBe('{}');
  });

  it('decodes an unencoded data url', () => {
    expect(inlineMapOf(`data:application/json,${encodeURIComponent('{"a":1}')}`)).toBe('{"a":1}');
  });

  it('is not an inline map when it is a file name', () => {
    expect(inlineMapOf('hero.js.map')).toBeNull();
  });
});

describe('the sidecar map’s url, which the page names', () => {
  const module = 'http://localhost:5319/src/Hero.jsx';

  it('resolves a relative name against the module', () => {
    expect(sidecarUrlOf('Hero.jsx.map', module)).toBe('http://localhost:5319/src/Hero.jsx.map');
  });

  it('resolves a root-relative name against the module’s origin', () => {
    expect(sidecarUrlOf('/maps/Hero.map', module)).toBe('http://localhost:5319/maps/Hero.map');
  });

  /* The whole point of the guard: main has no origin and no CORS, so a
     compromised dependency naming another host would get main to fetch it. */
  it('refuses another origin', () => {
    expect(sidecarUrlOf('http://evil.example/steal', module)).toBeNull();
    expect(sidecarUrlOf('http://localhost:9999/other', module)).toBeNull();
  });

  it('refuses a module that is not on a local address', () => {
    expect(sidecarUrlOf('Hero.map', 'https://example.com/src/Hero.jsx')).toBeNull();
  });

  /* A name that is not a url is a relative path, and resolving one cannot leave
     the origin — which is the property the guard is for, not the name's shape. */
  it('keeps a nonsense name on the module’s own origin', () => {
    expect(sidecarUrlOf('::::', module)).toBe('http://localhost:5319/src/::::');
  });

  it('refuses a protocol-relative name, which changes host without a scheme', () => {
    expect(sidecarUrlOf('//evil.example/map', module)).toBeNull();
  });
});

describe('normalising the four ways a map spells a source', () => {
  it('takes a plain relative path unchanged', () => {
    expect(sourcePathOf('src/Hero.jsx')).toBe('src/Hero.jsx');
  });

  it('takes an absolute path, which Vite writes', () => {
    expect(sourcePathOf('/Users/d/proj/src/Hero.jsx')).toBe('/Users/d/proj/src/Hero.jsx');
  });

  it('turns a file url into a path', () => {
    expect(sourcePathOf('file:///Users/d/proj/src/My%20Hero.jsx')).toBe(
      '/Users/d/proj/src/My Hero.jsx',
    );
  });

  it('strips webpack’s namespace and its dot prefix', () => {
    expect(sourcePathOf('webpack://my-app/./src/Hero.jsx')).toBe('src/Hero.jsx');
    expect(sourcePathOf('webpack:///./src/Hero.jsx')).toBe('src/Hero.jsx');
  });

  it('strips Turbopack’s bracketed root', () => {
    expect(sourcePathOf('turbopack://[project]/src/Hero.tsx')).toBe('src/Hero.tsx');
    expect(sourcePathOf('turbopack://[project]/src/My%20Hero.tsx')).toBe('src/My Hero.tsx');
  });

  it('takes the path out of a served url', () => {
    expect(sourcePathOf('http://localhost:5319/src/Hero.jsx')).toBe('/src/Hero.jsx');
  });

  it('drops a dev server’s cache-busting query and any fragment', () => {
    expect(sourcePathOf('src/Hero.jsx?t=1759')).toBe('src/Hero.jsx');
    expect(sourcePathOf('src/Hero.jsx#frag')).toBe('src/Hero.jsx');
  });

  it('answers nothing rather than an empty path', () => {
    expect(sourcePathOf('')).toBeNull();
    expect(sourcePathOf('?t=1')).toBeNull();
  });
});

describe('resolving a position through the map', () => {
  /* The bug this guards: a map counts columns from 0 and V8 from 1, so an
     off-by-one here silently returns the wrong token's mapping. */
  it('moves the column to the map’s base and back again', () => {
    expect(originalPositionOf(MAP, { url: 'x', line: 5, column: 11 })).toEqual({
      path: 'src/Hero.jsx',
      line: 2,
      column: 5,
    });
  });

  it('answers nothing for a generated position the map does not cover', () => {
    expect(originalPositionOf(MAP, { url: 'x', line: 99, column: 1 })).toBeNull();
  });

  it('answers nothing for a map that is not json', () => {
    expect(originalPositionOf('not json', { url: 'x', line: 1, column: 1 })).toBeNull();
  });
});

describe('the whole resolution', () => {
  const inline = `//# sourceMappingURL=data:application/json;base64,${Buffer.from(MAP, 'utf8').toString('base64')}`;

  it('resolves through an inline map with no second fetch', async () => {
    const asked: string[] = [];
    const answer = await resolveThroughMap(
      {
        fetchText: async (url) => {
          asked.push(url);
          return inline;
        },
      },
      { url: 'http://localhost:5319/src/Hero.jsx', line: 5, column: 11 },
    );
    expect(answer).toEqual({ path: 'src/Hero.jsx', line: 2, column: 5 });
    expect(asked).toEqual(['http://localhost:5319/src/Hero.jsx']);
  });

  it('fetches a sidecar map from the module’s own origin', async () => {
    const asked: string[] = [];
    const answer = await resolveThroughMap(
      {
        fetchText: async (url) => {
          asked.push(url);
          return url.endsWith('.map') ? MAP : '//# sourceMappingURL=Hero.jsx.map';
        },
      },
      { url: 'http://localhost:5319/src/Hero.jsx', line: 5, column: 11 },
    );
    expect(answer).toEqual({ path: 'src/Hero.jsx', line: 2, column: 5 });
    expect(asked).toEqual([
      'http://localhost:5319/src/Hero.jsx',
      'http://localhost:5319/src/Hero.jsx.map',
    ]);
  });

  it('never fetches a sidecar from another origin', async () => {
    const asked: string[] = [];
    const answer = await resolveThroughMap(
      {
        fetchText: async (url) => {
          asked.push(url);
          return '//# sourceMappingURL=http://evil.example/map';
        },
      },
      { url: 'http://localhost:5319/src/Hero.jsx', line: 5, column: 11 },
    );
    expect(answer).toBeNull();
    expect(asked).toEqual(['http://localhost:5319/src/Hero.jsx']);
  });

  it('never fetches anything for a module that is not on a local address', async () => {
    const asked: string[] = [];
    const answer = await resolveThroughMap(
      {
        fetchText: async (url) => {
          asked.push(url);
          return inline;
        },
      },
      { url: 'https://cdn.example.com/app.js', line: 5, column: 11 },
    );
    expect(answer).toBeNull();
    expect(asked).toEqual([]);
  });

  /* The React 18 field names the file outright, so there is nothing served to
     fetch and nothing to map. */
  it('takes a position that is already a path without fetching', async () => {
    const answer = await resolveThroughMap(
      {
        fetchText: async () => {
          throw new Error('should not fetch');
        },
      },
      { url: 'src/Old.jsx', line: 7, column: 2 },
    );
    expect(answer).toEqual({ path: 'src/Old.jsx', line: 7, column: 2 });
  });

  it('answers nothing when the module carries no map', async () => {
    expect(
      await resolveThroughMap(
        { fetchText: async () => 'export const a = 1' },
        { url: 'http://localhost:5319/src/Hero.jsx', line: 5, column: 11 },
      ),
    ).toBeNull();
  });
});

describe('the two ways a dev server spells one source (ONL-2563)', () => {
  /* Vite dev's own shape: the module is served at `/src/main.jsx` and its map names `main.jsx`,
     which at the worktree root is a file that does not exist. */
  it('resolves a bare name against the module it came from, and keeps the raw spelling too', () => {
    expect(sourceSpellings('main.jsx', 'http://127.0.0.1:5173/src/main.jsx')).toEqual([
      'src/main.jsx',
      'main.jsx',
    ]);
  });

  it('offers the project-relative spelling first, so a doubled folder falls through to it', () => {
    expect(sourceSpellings('src/main.jsx', 'http://127.0.0.1:5173/src/main.jsx')).toEqual([
      'src/src/main.jsx',
      'src/main.jsx',
    ]);
  });

  it('tries an absolute entry as written first', () => {
    expect(sourceSpellings('/Users/me/app/src/main.jsx', 'http://127.0.0.1:5173/src/main.jsx')).toEqual([
      '/Users/me/app/src/main.jsx',
      'Users/me/app/src/main.jsx',
    ]);
  });

  /* `sourceRoot: "/src/"` makes every entry absolute against the SERVER, not the disk, and taking
     that as a filesystem path finds nothing. */
  it('also offers a server-absolute entry relative to the project', () => {
    expect(sourceSpellings('/src/main.jsx', 'http://127.0.0.1:5173/assets/index-abc.js')).toEqual([
      '/src/main.jsx',
      'src/main.jsx',
    ]);
  });

  it('answers the entry as written when the module url cannot be parsed', () => {
    expect(sourceSpellings('main.jsx', 'not a url')).toEqual(['main.jsx']);
  });
});
