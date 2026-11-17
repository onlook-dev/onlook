import { describe, expect, it } from 'bun:test';
import { MENTIONS_EXISTING, isUnder } from './listeners.js';

describe('isUnder', () => {
  it('admits a path inside a root, or equal to it, and refuses one outside', () => {
    expect(isUnder('/a/b/c', '/a/b')).toBe(true);
    expect(isUnder('/a/b', '/a/b')).toBe(true);
    expect(isUnder('/a/b/', '/a/b')).toBe(true);
    expect(isUnder('/a/x', '/a/b')).toBe(false);
    expect(isUnder('/a/x', ['/a/b', '/a/x/y'])).toBe(false);
    expect(isUnder('/a/x/y/z', ['/a/b', '/a/x/y'])).toBe(true);
  });

  it('a sibling that merely shares the prefix is not inside', () => {
    expect(isUnder('/a/bc', '/a/b')).toBe(false);
    expect(isUnder('/a/b-2/src', '/a/b')).toBe(false);
  });
});

describe('MENTIONS_EXISTING', () => {
  const names = [
    'Port 3000 is already in use by your server, so I started a separate copy on 3001.',
    'Port 3000 already answers from another checkout; yours is untouched.',
    'Something already answers on port 3000 that is not from this worktree — I left it running.',
    "The user's server on 3000 was left alone; mine is on 5174.",
    'A server was already running on 3000, started from a different folder, so I used 3001.',
    'There is an existing dev server on 3000; I leave it as is and serve from 3002.',
    'Port 3000 was taken by another process, so this copy listens on 3001.',
  ];
  const own = [
    'Started the dev server; it is already up on port 3001.',
    'The dev server is already running on 3001 (I started it a moment ago).',
    'Ran the app\'s existing dev command and it came up on 5173.',
    'Dev server started on http://localhost:3000.',
    'I started the server on port 3000 and confirmed it answers.',
  ];

  it('counts a reply that names a server the agent did not start', () => {
    for (const reply of names) expect(reply).toMatch(MENTIONS_EXISTING);
  });

  it('does not count the agent describing its own copy', () => {
    for (const reply of own) expect(reply).not.toMatch(MENTIONS_EXISTING);
  });
});
