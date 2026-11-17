import { describe, expect, it } from 'bun:test';
import { checkScratch, violationMessage } from './check-scratch.js';

// Deleted by hand; scripts/get-beta.sh went with them and no rule here reaches it (ONL-2400).
const HISTORICAL_ORPHANS = [
  'tests/e2e/tools/agent-setup-walk.ts',
  'tests/e2e/tools/live-register.scratch.ts',
  'tests/e2e/tools/onl-1944-reset-walk.ts',
  'tests/e2e/tools/onl-2015-approval.scratch.ts',
  'tests/e2e/tools/onl-2072-journey.scratch.ts',
  'tests/e2e/tools/onl-2081-real-drive.ts',
  'tests/e2e/tools/onl-2090-nav-walk.scratch.ts',
  'tests/e2e/tools/onl-2091-attachment.scratch.ts',
  'tests/e2e/tools/onl-2108-banner-walk.scratch.ts',
  'tests/e2e/tools/reducer-seam.scratch.ts',
  'tests/live/onl-2070-canvas.scratch.ts',
  'tests/e2e/tools/cdp-drive.ts',
  'tests/e2e/tools/close-race.mjs',
  'tests/e2e/tools/comfort-switcher-drive.ts',
  'tests/e2e/tools/frame-strip.ts',
  'tests/e2e/tools/onl-2115-settings-geometry.scratch.ts',
  'tests/e2e/tools/onl-2206-popovers.scratch.ts',
  'tests/e2e/tools/onl-2236-band.scratch.ts',
  'tests/e2e/tools/onl-2243-two-tabs.scratch.ts',
  'tests/e2e/tools/onl-2270-new-tab.scratch.ts',
  'tests/e2e/tools/onl-2312-band.scratch.ts',
  'tests/e2e/tools/onl-2358-typing-cost.scratch.ts',
  'tests/live/probe-turn.ts',
  'tests/live/server-scenarios.ts',
];

const CLEAN = [
  'tests/e2e/smoke.e2e.ts',
  'tests/live/resume.live.ts',
  'tests/e2e/contract.ts',
  'tests/e2e/launch.ts',
  'tests/live/recording.ts',
  'tests/live/replay-divergence.ts',
  'tests/apparatus/src/launch.ts',
  'tests/live/recordings/claude/tools.jsonl',
];

function refused(files: string[]): string[] {
  return [...new Set(checkScratch({ files }).violations.map((v) => v.file))];
}

describe('the throwaway destination is enforced (ONL-2400)', () => {
  it('FAILS on every one-off script history had to delete by hand', () => {
    expect(refused(HISTORICAL_ORPHANS).sort()).toEqual([...HISTORICAL_ORPHANS].sort());
  });

  it('PASSES on a suffixed spec, a named library, an apparatus module and a recording', () => {
    expect(checkScratch({ files: CLEAN }).violations).toEqual([]);
  });

  it('throws when the file list is empty rather than reporting a pass', () => {
    expect(() => checkScratch({ files: [] })).toThrow('scanned 0 files');
  });
});

describe('the marker rule refuses a force-added throwaway', () => {
  it('FAILS on a path with a .scratch/ segment', () => {
    const files = ['.scratch/onl-2400-drive.ts'];
    const { violations } = checkScratch({ files });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('throwaway-marker');
    expect(violations[0]?.file).toBe(files[0]);
  });

  it('FAILS on a .scratch. basename outside that directory', () => {
    const { violations } = checkScratch({ files: ['scripts/onl-2400-probe.scratch.ts'] });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('throwaway-marker');
  });

  it('FAILS inside a directory the marker names, which the ignore rule also hides', () => {
    expect(refused(['scripts/.scratch.work/probe.ts'])).toEqual([
      'scripts/.scratch.work/probe.ts',
    ]);
  });

  it('PASSES on a tracked probe.ts in product source', () => {
    expect(
      checkScratch({ files: ['apps/studio/src/main/agent-host/probe.ts'] }).violations,
    ).toEqual([]);
  });
});

describe('a constrained tier holds only what its collectors run', () => {
  it('FAILS on an unsuffixed script directly under tests/e2e/ and a directory deeper', () => {
    expect(refused(['tests/e2e/frame-strip.ts'])).toEqual(['tests/e2e/frame-strip.ts']);
    expect(refused(['tests/e2e/tools/frame-strip.ts'])).toEqual(['tests/e2e/tools/frame-strip.ts']);
  });

  it('FAILS on an unsuffixed .mjs under tests/e2e/', () => {
    expect(refused(['tests/e2e/tools/close-race.mjs'])).toEqual(['tests/e2e/tools/close-race.mjs']);
  });

  it('FAILS on an unsuffixed script under tests/live/', () => {
    expect(refused(['tests/live/server-scenarios.ts'])).toEqual(['tests/live/server-scenarios.ts']);
  });

  it('PASSES on every marker the unit runner collects under tests/e2e/', () => {
    const collected = [
      'tests/e2e/contract.test.ts',
      'tests/e2e/contract_test.ts',
      'tests/e2e/layout.spec.ts',
      'tests/e2e/layout_spec.ts',
      'tests/e2e/layout.spec.tsx',
    ];

    expect(checkScratch({ files: collected }).violations).toEqual([]);
  });

  it('FAILS on a .test.ts under tests/live/, which no runner collects', () => {
    expect(refused(['tests/live/recording.test.ts'])).toEqual(['tests/live/recording.test.ts']);
  });

  it('FAILS on a .e2e marker carrying an extension Playwright does not collect', () => {
    const uncollected = [
      'tests/e2e/tools/drive.e2e.mjs',
      'tests/e2e/tools/drive.e2e.js',
      'tests/e2e/tools/drive.e2e.tsx',
    ];

    expect(refused(uncollected).sort()).toEqual([...uncollected].sort());
  });

  it('FAILS on an unsuffixed .js, .cjs or .jsx under a constrained tier', () => {
    const uncollected = ['tests/live/probe.js', 'tests/live/probe.cjs', 'tests/e2e/drive.jsx'];

    expect(refused(uncollected).sort()).toEqual([...uncollected].sort());
  });

  it('PASSES on a recordings data file, which the extension set excludes', () => {
    expect(
      checkScratch({ files: ['tests/live/recordings/codex/interrupt.jsonl'] }).violations,
    ).toEqual([]);
  });

  it('does not let a sibling directory inherit the tier', () => {
    expect(checkScratch({ files: ['tests/e2e-archive/frame-strip.ts'] }).violations).toEqual([]);
  });

  it('does not let a named library lend its name to another tier', () => {
    expect(refused(['tests/live/contract.ts'])).toEqual(['tests/live/contract.ts']);
  });
});

describe('a refusal says where the file goes and why', () => {
  it('names the file, the destination and the because', () => {
    const file = 'tests/e2e/tools/frame-strip.ts';
    const { violations } = checkScratch({ files: [file] });
    const message = violationMessage(violations[0]!);

    expect(message).toContain(file);
    expect(message).toContain('.scratch/');
    expect(message).toContain(`because ${violations[0]!.rule.because}`);
    expect(violations[0]!.rule.because.length).toBeGreaterThan(0);
  });

  it('never offers a runner suffix as the way through', () => {
    const { violations } = checkScratch({ files: ['tests/e2e/tools/frame-strip.ts'] });
    const message = violationMessage(violations[0]!);

    for (const suffix of ['.e2e.ts', '.live.ts', '.test.ts']) {
      expect(message).not.toContain(suffix);
    }
  });

  it('says the marked file arrived by a force-add', () => {
    const { violations } = checkScratch({ files: ['.scratch/onl-2400-drive.ts'] });
    const message = violationMessage(violations[0]!);

    expect(message).toContain('.scratch/');
    expect(message).toContain('force-add');
  });
});
