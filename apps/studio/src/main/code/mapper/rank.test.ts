import { describe, expect, it } from 'bun:test';
import type { CodeSearchFileMatches } from '@studio/events';
import { evidenceQueries, rankByEvidence, rankByName } from './rank.js';

function file(path: string, ...texts: string[]): CodeSearchFileMatches {
  return {
    path,
    lines: texts.map((text, index) => ({ line: index + 1, text, column: 0 })),
    total: texts.length,
  };
}

describe('ranking tag, classes and text without React identity', () => {
  it('does not offer documentation and data as executable source for repeated labels', () => {
    const evidence = { tag: 'a', classes: [], text: 'Start Designing' };
    const files = [
      file('.traces/user-flows.md', 'Start Designing'),
      file('content.json', '"Start Designing"'),
      file('src/Hero.tsx', '<a>Start Designing</a>'),
      file('src/HeaderCTA.vue', '<a>Start Designing</a>'),
    ];
    expect(rankByEvidence(evidence, files).candidates.map(candidate => candidate.path)).toEqual(['src/HeaderCTA.vue', 'src/Hero.tsx']);
    expect(rankByName('Hero', [file('guide.md', 'function Hero() {'), file('src/Hero.tsx', 'function Hero() {')]).candidates.map(candidate => candidate.path)).toEqual(['src/Hero.tsx']);
  });
  const evidence = { tag: 'h1', classes: ['hero-title'], text: 'Welcome home' };
  it('rejects a generic document tag without matching text or classes', () => {
    for (const tag of ['html', 'body', 'div']) {
      expect(rankByEvidence({ tag, classes: [], text: 'HTTPError 500: fixture failure' },
        [file('src/routes/__root.tsx', `return <${tag}><Outlet /></${tag}>;`)]).candidates).toEqual([]);
    }
  });
  it('keeps a tag with a matching class even when its text is dynamic', () => {
    expect(rankByEvidence(evidence, [file('src/home.html', '<h1 class="hero-title">{title}</h1>')]).candidates).toHaveLength(1);
  });
  it('ranks combined evidence ahead of a matching class and keeps corroborated alternatives', () => {
    const ranked = rankByEvidence(evidence, [file('src/other.html', '<h1 class="hero-title">Elsewhere</h1>'), file('src/home.html', '<h1 class="hero-title">Welcome home</h1>')]);
    expect(ranked.candidates.map((candidate) => candidate.path)).toEqual(['src/home.html', 'src/other.html']);
  });
  it('deduplicates a line returned by several evidence queries', () => {
    const found = file('index.html', '<h1 class="hero-title">Welcome home</h1>');
    expect(rankByEvidence(evidence, [found, found]).candidates).toHaveLength(1);
  });
  it('does not turn a CSS class definition into an element location', () => {
    expect(rankByEvidence(evidence, [file('style.css', '.hero-title { color: teal; }')]).candidates).toEqual([]);
  });
  it('bounds and deduplicates queries', () => {
    expect(evidenceQueries({ tag: 'h1', text: '', classes: ['title', 'title', 'hero', 'big', 'ignored'] })).toEqual(['title', 'hero', 'big', 'h1']);
  });
});

describe('ranking a component’s name across the project (ONL-2563)', () => {
  it('takes a declaration and leaves a use out of the candidates', () => {
    const { candidates } = rankByName('Hero', [
      file('src/Hero.jsx', 'export function Hero() {'),
      file('src/App.jsx', '  return <Hero />'),
    ]);
    expect(candidates.map((candidate) => candidate.path)).toEqual(['src/Hero.jsx']);
  });

  it('counts the files that use it, which is what warns before an edit', () => {
    const { uses } = rankByName('Hero', [
      file('src/Hero.jsx', 'export function Hero() {'),
      file('src/App.jsx', '  return <Hero />'),
      file('src/Page.jsx', '<Hero title="x" />'),
    ]);
    expect(uses).toBe(2);
  });

  it('does not count the declaring file as a use of itself', () => {
    const { uses } = rankByName('Hero', [
      file('src/Hero.jsx', 'export function Hero() {', 'return <Hero />'),
    ]);
    expect(uses).toBe(0);
  });

  it('takes the four shapes a component is declared in', () => {
    for (const text of [
      'function Card() {',
      'class Card extends Component {',
      'const Card = () => (',
      'const Card = React.memo(function (props) {',
    ]) {
      expect(rankByName('Card', [file('src/x.jsx', text)]).candidates.length).toBe(1);
    }
  });

  it('takes a forwardRef declaration', () => {
    expect(rankByName('Field', [file('src/x.jsx', 'Field = forwardRef((props, ref) => {')]).candidates.length).toBe(1);
  });

  it('ranks the file named after the component first', () => {
    const { candidates } = rankByName('Hero', [
      file('src/widgets/misc.jsx', 'function Hero() {'),
      file('src/Hero.jsx', 'function Hero() {'),
    ]);
    expect(candidates[0]?.path).toBe('src/Hero.jsx');
  });

  /* A story or a test declares a component of the same name constantly, and
     sending a designer there instead of the real one is the worst miss. */
  it('ranks a test or a story below the real source', () => {
    const { candidates } = rankByName('Hero', [
      file('src/Hero.test.jsx', 'function Hero() {'),
      file('src/Hero.stories.tsx', 'function Hero() {'),
      file('src/widgets/misc.jsx', 'function Hero() {'),
    ]);
    expect(candidates[0]?.path).toBe('src/widgets/misc.jsx');
  });

  it('keeps the search’s order between candidates that tie', () => {
    const { candidates } = rankByName('Hero', [
      file('src/a/Thing.jsx', 'function Hero() {'),
      file('src/b/Thing.jsx', 'function Hero() {'),
    ]);
    expect(candidates.map((candidate) => candidate.path)).toEqual([
      'src/a/Thing.jsx',
      'src/b/Thing.jsx',
    ]);
  });

  it('reports the declaration’s own line, 1-based in both axes', () => {
    const { candidates } = rankByName('Hero', [
      { path: 'src/Hero.jsx', lines: [{ line: 12, text: 'function Hero() {', column: 9 }], total: 1 },
    ]);
    expect(candidates[0]).toMatchObject({ line: 12, column: 10 });
  });

  /* `Hero` must not be found inside `HeroBanner`, or every candidate list
     becomes every neighbouring name. */
  it('does not match a longer name that starts the same', () => {
    expect(rankByName('Hero', [file('src/x.jsx', 'function HeroBanner() {')]).candidates).toEqual([]);
    expect(rankByName('Hero', [file('src/x.jsx', '<HeroBanner />')]).uses).toBe(0);
  });

  it('answers nothing for a nameless element rather than matching everything', () => {
    expect(rankByName('', [file('src/x.jsx', 'function Hero() {')])).toEqual({
      candidates: [],
      uses: 0,
    });
  });

  it('treats a name with regex punctuation as a name', () => {
    expect(rankByName('a.b', [file('src/x.jsx', 'function axb() {')]).candidates).toEqual([]);
  });
});

describe('breaking a tie between two declarations of one name (ONL-2563)', () => {
  /* The common shape: a component and an archived copy of it. Depth decides,
     rather than reading meaning into either folder's name. */
  it('prefers the shallower path when the scores are equal', () => {
    const { candidates } = rankByName('Hero', [
      file('src/legacy/Hero.jsx', 'function Hero() {'),
      file('src/Hero.jsx', 'function Hero() {'),
    ]);
    expect(candidates[0]?.path).toBe('src/Hero.jsx');
  });

  it('still lets a better score beat a shallower path', () => {
    const { candidates } = rankByName('Hero', [
      file('Hero.test.jsx', 'function Hero() {'),
      file('src/components/Hero.jsx', 'function Hero() {'),
    ]);
    expect(candidates[0]?.path).toBe('src/components/Hero.jsx');
  });

  it('keeps the search’s order when score and depth both tie', () => {
    const { candidates } = rankByName('Hero', [
      file('src/a/Thing.jsx', 'function Hero() {'),
      file('src/b/Thing.jsx', 'function Hero() {'),
    ]);
    expect(candidates.map((candidate) => candidate.path)).toEqual([
      'src/a/Thing.jsx',
      'src/b/Thing.jsx',
    ]);
  });
});
