import { describe, expect, it } from 'bun:test';
import { directImports, relatedImports, relativeSpecifiers } from './imports.js';

const FILES = [
  'src/Hero.jsx',
  'src/components/Badge.jsx',
  'src/styles/tokens.css',
  'src/util/index.ts',
  'src/App.tsx',
];

describe('what a file names as its own neighbours (ONL-2563)', () => {
  it('reads the three shapes an import takes', () => {
    expect(relativeSpecifiers("import { Badge } from './components/Badge';")).toEqual(['./components/Badge']);
    expect(relativeSpecifiers("import './styles/tokens.css';")).toEqual(['./styles/tokens.css']);
    expect(relativeSpecifiers("const x = require('./util');")).toEqual(['./util']);
  });

  it('reads an export-from as an import too', () => {
    expect(relativeSpecifiers("export { Badge } from './components/Badge';")).toEqual(['./components/Badge']);
  });

  /* A bare specifier is a dependency, and `node_modules` is not what the designer
     came here for. */
  it('ignores a bare specifier', () => {
    expect(relativeSpecifiers("import React from 'react';")).toEqual([]);
  });

  it('names each specifier once, however many times it appears', () => {
    expect(relativeSpecifiers("import a from './x';\nimport b from './x';")).toEqual(['./x']);
  });
});

describe('resolving those to files the panel can open', () => {
  it('fills in the extension a specifier left off', () => {
    expect(directImports('src/Hero.jsx', "import { Badge } from './components/Badge';", FILES)).toEqual([
      'src/components/Badge.jsx',
    ]);
  });

  it('resolves a step back up against the importing file', () => {
    expect(directImports('src/components/Badge.jsx', "import '../styles/tokens.css';", FILES)).toEqual([
      'src/styles/tokens.css',
    ]);
  });

  it('resolves a folder to its index', () => {
    expect(directImports('src/Hero.jsx', "import { x } from './util';", FILES)).toEqual(['src/util/index.ts']);
  });

  /* Suggesting a file the project does not have would send a designer nowhere. */
  it('drops a specifier that resolves to no file in the project', () => {
    expect(directImports('src/Hero.jsx', "import './nowhere';", FILES)).toEqual([]);
  });

  it('never suggests the file back to itself', () => {
    expect(directImports('src/Hero.jsx', "import './Hero';", FILES)).toEqual([]);
  });
});

describe('both ends of a pick, not only the file the panel has open (ONL-2563)', () => {
  const HERO = ['./components/Badge', './styles/tokens.css'];
  const APP = ['./Hero', './util'];

  it('suggests what the component definition imports as well as the mapped file', () => {
    expect(
      relatedImports(
        [
          { path: 'src/App.tsx', specifiers: APP },
          { path: 'src/Hero.jsx', specifiers: HERO },
        ],
        FILES,
      ),
    ).toEqual(['src/util/index.ts', 'src/components/Badge.jsx', 'src/styles/tokens.css']);
  });

  /* The mapped file and the definition are their own rows in Suggested; repeating one of them under
     Related would spend a slot on a file already offered. */
  it('never suggests either seed back', () => {
    expect(
      relatedImports(
        [
          { path: 'src/App.tsx', specifiers: ['./Hero'] },
          { path: 'src/Hero.jsx', specifiers: ['./App'] },
        ],
        FILES,
      ),
    ).toEqual([]);
  });

  it('names a file both seeds import once', () => {
    expect(
      relatedImports(
        [
          { path: 'src/App.tsx', specifiers: ['./components/Badge'] },
          { path: 'src/Hero.jsx', specifiers: ['./components/Badge'] },
        ],
        FILES,
      ),
    ).toEqual(['src/components/Badge.jsx']);
  });

  /* A pick whose component is declared in the file it mapped to has one seed, read once. */
  it('answers for a single seed', () => {
    expect(relatedImports([{ path: 'src/Hero.jsx', specifiers: HERO }], FILES)).toEqual([
      'src/components/Badge.jsx',
      'src/styles/tokens.css',
    ]);
  });

  it('answers nothing for a pick that placed nothing', () => {
    expect(relatedImports([], FILES)).toEqual([]);
  });
});

describe('an import written across several lines (ONL-2563)', () => {
  /* The shape a formatter writes for more than one name, which is most of them. */
  it('reads a braced import broken over lines', () => {
    expect(
      relativeSpecifiers('import {\n  Badge,\n  Hero,\n} from "./components/Badge.jsx";\n'),
    ).toEqual(['./components/Badge.jsx']);
  });

  it('reads a type-only multi-line import', () => {
    expect(relativeSpecifiers('import type {\n  Props,\n} from "../types.js";\n')).toEqual(['../types.js']);
  });

  it('does not run past a statement that has no specifier', () => {
    expect(relativeSpecifiers('import unrelated;\nconst x = "./not-an-import.js";\n')).toEqual([]);
  });

  it('still reads the single-line shapes beside it', () => {
    expect(relativeSpecifiers('import a from "./a.js";\nimport {\n b,\n} from "./b.js";\n')).toEqual([
      './a.js',
      './b.js',
    ]);
  });
});
