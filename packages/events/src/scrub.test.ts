import { describe, expect, it } from 'bun:test';
import { FILENAME_MAX, FRAMES_MAX, MESSAGE_MAX, REDACTED_PATH, REDACTED_REF, scrubClass, scrubException, scrubFrame, scrubMessage, scrubPaths, scrubStack } from './scrub.js';

describe('scrubPaths', () => {
  it('redacts every path shape the codebase produces', () => {
    const cases: Array<[string, string]> = [
      ['opened /Users/wren/repo/src/x.ts today', `opened ${REDACTED_PATH} today`],
      ['at file:///Users/wren/repo/out/main/index.js:1:1', `at ${REDACTED_PATH}`],
      ['C:\\Users\\wren\\repo\\x.ts failed', `${REDACTED_PATH} failed`],
      ['see /home/wren/x and /tmp/y', `see ${REDACTED_PATH} and ${REDACTED_PATH}`],
      ['push to https://github.com/org/repo.git rejected', `push to ${REDACTED_PATH} rejected`],
      ['remote git@github.com:org/repo.git rejected', `remote ${REDACTED_PATH} rejected`],
      ['/Volumes/External/proj', REDACTED_PATH],
    ];
    for (const [input, expected] of cases) expect(scrubPaths(input)).toBe(expected);
  });

  it('a space inside a path does not end the redaction (ONL-2343 review)', () => {
    const cases: Array<[string, string]> = [
      ['/Users/wren/Client Work/acme/Payment.tsx', REDACTED_PATH],
      ['/Users/wren/My Documents/My Project/file.ts', REDACTED_PATH],
      ['C:\\Users\\wren\\Client Work\\a.ts', REDACTED_PATH],
      ['at /Users/wren/proj/a.ts failed to load', `at ${REDACTED_PATH} failed to load`],
    ];
    for (const [input, expected] of cases) expect(scrubPaths(input)).toBe(expected);
  });

  it('redacts the home shorthand and the roots a Linux box uses', () => {
    const cases: Array<[string, string]> = [
      ['~/work/repo/src/App.tsx', REDACTED_PATH],
      ['/media/wren/disk/proj/a.ts', REDACTED_PATH],
      ['/run/user/1000/studio.sock', REDACTED_PATH],
    ];
    for (const [input, expected] of cases) expect(scrubPaths(input)).toBe(expected);
  });

  it('leaves a bare relative path alone, deliberately', () => {
    expect(scrubPaths('failed in src/App.tsx')).toBe('failed in src/App.tsx');
  });

  it('leaves a path-free string alone', () => {
    expect(scrubPaths('worktree head mismatch (remote)')).toBe('worktree head mismatch (remote)');
  });
});

describe('scrubMessage', () => {
  it('redacts bare filenames and dotfiles before truncating telemetry messages', () => {
    for (const filename of ['.env', '.env.local', '.123', 'README.md', 'package.json', 'bun.lock', 'config.yaml', 'secret.customextension', '设计.tsx']) {
      expect(scrubMessage(`cannot open ${filename}`)).toBe(`cannot open ${REDACTED_PATH}`);
      expect(scrubMessage(`untracked files:\n\t${filename}`)).toBe(`untracked files:\n\t${REDACTED_PATH}`);
    }
    expect(scrubMessage(`cannot open ${'private'.repeat(60)}.json`)).toBe(`cannot open ${REDACTED_PATH}`);
    expect(scrubMessage('cannot open "private project notes.md"')).toBe(`cannot open ${REDACTED_PATH}`);
    expect(scrubMessage('cannot open `private project notes.md`')).toBe(`cannot open ${REDACTED_PATH}`);
    expect(scrubMessage("reading 'map' failed in README.md")).toBe(`reading 'map' failed in ${REDACTED_PATH}`);
  });

  it('redacts the branch in worktree preparation output outside git diagnostics', () => {
    expect(scrubMessage("Preparing worktree (new branch 'private-handle/private-project')\nfatal: failed"))
      .toBe(`Preparing worktree (new branch '${REDACTED_REF}')\nfatal: failed`);
  });

  it('redacts complete filesystem operands including extensionless and spaced filenames', () => {
    for (const filename of ['private-client-ledger', ' private-client-ledger', 'private notes.md', 'customer,roadmap.json', 'README', 'LICENSE']) {
      expect(scrubMessage(`ENOENT: no such file or directory, open '${filename}'`))
        .toBe(`ENOENT: no such file or directory, open ${REDACTED_PATH}`);
      expect(scrubMessage(`cannot open ${filename}`)).toBe(`cannot open ${REDACTED_PATH}`);
      expect(scrubMessage(`untracked files:\n\t${filename}`)).toBe(`untracked files:\n\t${filename.startsWith(' ') ? ' ' : ''}${REDACTED_PATH}`);
    }
    expect(scrubMessage("ENOENT: rename 'private-source' -> 'private-destination'"))
      .toBe(`ENOENT: rename ${REDACTED_PATH}`);
    expect(scrubMessage('open /Users/wren/repo/.env failed')).toBe(`open ${REDACTED_PATH} failed`);
    expect(scrubMessage('rename /Users/wren/repo/source -> private-destination'))
      .toBe(`rename ${REDACTED_PATH}`);
  });

  it('truncates AFTER scrubbing, so a cut cannot leave half a path', () => {
    const path = `/Users/wren/${'a'.repeat(400)}`;
    const out = scrubMessage(`failed: ${path}`);
    expect(out).toBe(`failed: ${REDACTED_PATH}`);
    expect(out).not.toContain('wren');
  });

  it('bounds a long clean message, the cut mark included', () => {
    expect(scrubMessage('x'.repeat(MESSAGE_MAX * 4)).length).toBeLessThanOrEqual(MESSAGE_MAX);
  });

  it('a git failure keeps its verb and reason and loses every branch name', () => {
    const cases: Array<[string, string]> = [
      ["fatal: 'origin/feature-x' not found at https://github.com/org/repo.git", `fatal: '${REDACTED_REF}' not found at ${REDACTED_PATH}`],
      ["fatal: a branch named 'feature-x' already exists", `fatal: a branch named '${REDACTED_REF}' already exists`],
      ["fatal: 'feature-x' is already used by worktree at '/Users/wren/repo'", `fatal: '${REDACTED_REF}' is already used by worktree at '${REDACTED_PATH}'`],
      ["error: pathspec 'feature-x' did not match any file(s) known to git", `error: pathspec '${REDACTED_REF}' did not match any file(s) known to git`],
      ["fatal: couldn't find remote ref feature-x", `fatal: couldn't find remote ref ${REDACTED_REF}`],
      ['error: src refspec feature-x does not match any', `error: src refspec ${REDACTED_REF} does not match any`],
      ['fatal: invalid reference: feature-x', `fatal: invalid reference: ${REDACTED_REF}`],
      ['fatal: The current branch feature-x has no upstream branch.', `fatal: The current branch ${REDACTED_REF} has no upstream branch.`],
      [' ! [rejected]        feature-x -> feature-x (non-fast-forward)', ` ! [rejected]        ${REDACTED_REF} -> ${REDACTED_REF} (non-fast-forward)`],
      ["git status failed: fatal: ambiguous argument 'origin/feature-x': unknown revision", `git status failed: fatal: ambiguous argument '${REDACTED_REF}': unknown revision`],
    ];
    for (const [input, expected] of cases) expect(scrubMessage(input)).toBe(expected);
  });

  it('two git failures that differ only in the branch scrub to one message', () => {
    expect(scrubMessage("fatal: 'origin/feature-x' not found")).toBe(scrubMessage("fatal: 'origin/fix-login' not found"));
  });

  it('a relative path does not survive a message', () => {
    const cases: Array<[string, string]> = [
      ['CONFLICT (content): Merge conflict in src/App.tsx', `CONFLICT (content): Merge conflict in ${REDACTED_PATH}`],
      ['would be overwritten by checkout:\n\tsrc/components/Button.tsx', `would be overwritten by checkout:\n\t${REDACTED_PATH}`],
      ['cannot resolve ./components/Button from app\\page.tsx', `cannot resolve ${REDACTED_PATH} from ${REDACTED_PATH}`],
    ];
    for (const [input, expected] of cases) expect(scrubMessage(input)).toBe(expected);
  });

  it('a message with no git output or file path is left readable', () => {
    for (const message of [
      "Cannot read properties of undefined (reading 'map')",
      'thread/start returned no id',
      "the worktree isn't on a branch",
    ]) {
      expect(scrubMessage(message)).toBe(message);
    }
  });
});

describe('scrubClass', () => {
  it('keeps an identifier and replaces a message-shaped name', () => {
    expect(scrubClass('TypeError')).toBe('TypeError');
    expect(scrubClass('Error: /Users/wren/x')).toBe('Error');
  });
});

describe('scrubStack', () => {
  const stack = [
    'Error: boom',
    '    at cut (/Users/wren/repo/apps/studio/out/main/index.js:10:5)',
    '    at /Users/wren/repo/node_modules/electron/dist/x.js:3:4',
    '    at Object.<anonymous> (file:///Applications/Onlook.app/Contents/Resources/app.asar/out/main/index.js:7:9)',
    '    at C:\\Users\\wren\\repo\\out\\renderer\\index.js:2:2',
    'not a frame at all',
  ].join('\n');

  it('rewrites app frames under app://studio and redacts everything else', () => {
    const frames = scrubStack(stack, 'node:javascript');
    expect(frames).toEqual([
      { platform: 'node:javascript', filename: 'app://studio/main/index.js', function: 'cut', lineno: 10, colno: 5, in_app: true },
      { platform: 'node:javascript', filename: REDACTED_PATH, function: '<anonymous>', lineno: 3, colno: 4, in_app: false },
      { platform: 'node:javascript', filename: 'app://studio/out/main/index.js', function: 'Object.<anonymous>', lineno: 7, colno: 9, in_app: true },
      { platform: 'node:javascript', filename: 'app://studio/renderer/index.js', function: '<anonymous>', lineno: 2, colno: 2, in_app: true },
    ]);
    expect(JSON.stringify(frames)).not.toContain('/Users/');
    expect(JSON.stringify(frames)).not.toContain('wren');
  });

  it('caps the frame count', () => {
    const long = ['Error', ...Array.from({ length: FRAMES_MAX + 20 }, (_, i) => `    at f${String(i)} (/Users/x/out/main/i.js:${String(i)}:1)`)].join('\n');
    expect(scrubStack(long, 'node:javascript')).toHaveLength(FRAMES_MAX);
  });
});

describe('scrubException', () => {
  it('redacts bare filenames in exception values sent to PostHog', () => {
    expect(scrubException(new Error('cannot open .env'), 'node:javascript').value).toBe(`cannot open ${REDACTED_PATH}`);
  });

  it('an Error becomes class, scrubbed message and frames', () => {
    const error = new TypeError('cannot read /Users/wren/secret.env');
    const out = scrubException(error, 'node:javascript');
    expect(out.type).toBe('TypeError');
    expect(out.value).toBe(`cannot read ${REDACTED_PATH}`);
    expect(out.stacktrace?.frames.length).toBeGreaterThan(0);
  });

  it('a thrown string and a rejected object both land as Error', () => {
    expect(scrubException('/Users/wren/x', 'node:javascript')).toEqual({ type: 'Error', value: REDACTED_PATH });
    expect(scrubException({ code: 1 }, 'node:javascript')).toEqual({ type: 'Error', value: '[object Object]' });
  });
});

describe('scrubFrame', () => {
  it('re-scrubs a frame a renderer sent unscrubbed, and keeps one already rewritten', () => {
    expect(scrubFrame({ filename: '/Users/wren/repo/out/renderer/index.js', function: 'f', lineno: 1, colno: 2, in_app: true }, 'web:javascript')).toEqual({
      platform: 'web:javascript',
      filename: 'app://studio/renderer/index.js',
      function: 'f',
      lineno: 1,
      colno: 2,
      in_app: true,
    });
    expect(scrubFrame({ filename: 'app://studio/renderer/index.js', function: 'f', in_app: true }, 'web:javascript')).toEqual({
      platform: 'web:javascript',
      filename: 'app://studio/renderer/index.js',
      function: 'f',
      in_app: true,
    });
    expect(scrubFrame({ filename: '/Users/wren/node_modules/x.js', function: '/Users/wren/f' }, 'web:javascript')).toEqual({
      platform: 'web:javascript',
      filename: REDACTED_PATH,
      function: REDACTED_PATH,
      in_app: false,
    });
    expect(scrubFrame(null, 'web:javascript').filename).toBe(REDACTED_PATH);
  });

  it('stamps the platform it is told, never one the sender claimed', () => {
    expect(scrubFrame({ filename: 'app://studio/renderer/index.js', function: 'f', platform: 'node:javascript' }, 'web:javascript').platform).toBe(
      'web:javascript',
    );
  });

  it('re-scrubs and bounds a filename that merely CLAIMS the app prefix (ONL-2343 review)', () => {
    expect(scrubFrame({ filename: `app://studio/${'/Users/wren/repo/src/secret.ts'}`, function: 'f' }, 'web:javascript').filename).toBe(
      `app://studio/${REDACTED_PATH}`,
    );
    const long = scrubFrame({ filename: `app://studio/${'a'.repeat(900)}`, function: 'f' }, 'web:javascript').filename;
    expect(long.length).toBeLessThanOrEqual(FILENAME_MAX);
  });

});
