import { describe, expect, it } from 'bun:test';
import { positionOf, positionsOf } from './stack.js';

describe('reading a position out of an owner-stack frame (ONL-2563)', () => {
  it('takes the served url, line and column from a named frame', () => {
    expect(positionOf('    at Hero (http://localhost:5319/src/Hero.jsx:3:120)')).toEqual({
      url: 'http://localhost:5319/src/Hero.jsx',
      line: 3,
      column: 120,
    });
  });

  /* The port's own colon is in the url, so a left-to-right scheme match would
     cut the location at `http:` and read the port as the line. */
  it('keeps the port in the url rather than reading it as the line', () => {
    const position = positionOf('at App (http://127.0.0.1:5319/src/App.jsx:10:5)');
    expect(position?.url).toBe('http://127.0.0.1:5319/src/App.jsx');
    expect(position?.line).toBe(10);
  });

  it('takes an anonymous frame, which carries the location with no parentheses', () => {
    expect(positionOf('    at http://localhost:5319/src/main.jsx:1:1')).toEqual({
      url: 'http://localhost:5319/src/main.jsx',
      line: 1,
      column: 1,
    });
  });

  it('takes the bare shape the React 18 source field is rendered as', () => {
    expect(positionOf('at src/Old.jsx:7:2')).toEqual({ url: 'src/Old.jsx', line: 7, column: 2 });
  });

  it('takes a query string, which Vite appends to a served module', () => {
    expect(positionOf('at Card (http://localhost:5319/src/Card.jsx?t=1759:4:9)')?.url).toBe(
      'http://localhost:5319/src/Card.jsx?t=1759',
    );
  });

  /* An `Error`'s `.stack` begins with its own message line, and React pads its
     owner stacks with blank ones. Neither is a position. */
  it('refuses a header line, a blank line and anything with no numbers', () => {
    expect(positionOf('Error')).toBeNull();
    expect(positionOf('')).toBeNull();
    expect(positionOf('    at <anonymous>')).toBeNull();
  });

  it('refuses a location whose line or column is not a positive integer', () => {
    expect(positionOf('at x (http://a/b.js:0:4)')).toBeNull();
    expect(positionOf('at x (http://a/b.js:3:0)')).toBeNull();
    expect(positionOf('at x (http://a/b.js:three:4)')).toBeNull();
    expect(positionOf('at x (http://a/b.js:3.5:4)')).toBeNull();
  });

  it('refuses a location with no url left in front of the numbers', () => {
    expect(positionOf('at x (:3:4)')).toBeNull();
  });
});

describe('a whole stack', () => {
  it('keeps the page’s order, so the nearest writer stays first', () => {
    expect(
      positionsOf([
        'at Hero (http://localhost:5319/src/Hero.jsx:3:12)',
        'Error',
        'at App (http://localhost:5319/src/App.jsx:9:4)',
      ]),
    ).toEqual([
      { url: 'http://localhost:5319/src/Hero.jsx', line: 3, column: 12 },
      { url: 'http://localhost:5319/src/App.jsx', line: 9, column: 4 },
    ]);
  });

  it('answers nothing for a stack with no readable frame, rather than a guess', () => {
    expect(positionsOf(['Error', '    at <anonymous>'])).toEqual([]);
  });
});
