import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');

const DESTINATION = '.scratch/';

interface MarkerRule {
  readonly kind: 'throwaway-marker';
  readonly what: string;
  readonly matches: (path: string) => boolean;
  readonly remedy: string;
  readonly because: string;
}

interface Tier {
  readonly dir: string;
  readonly collected: RegExp;
  readonly libraries: readonly { readonly file: string; readonly because: string }[];
}

interface TierRule {
  readonly kind: 'uncollected-script';
  readonly what: string;
  readonly extensions: RegExp;
  readonly tiers: readonly Tier[];
  readonly remedy: string;
  readonly because: string;
}

type Rule = MarkerRule | TierRule;

const RULES: readonly Rule[] = [
  {
    kind: 'throwaway-marker',
    what: 'a throwaway the tree does not keep',
    matches: (path) =>
      path.split('/').some((part) => part === '.scratch' || part.includes('.scratch.')),
    remedy: `leave it untracked in ${DESTINATION}`,
    because:
      'both the destination and the marker are git-ignored, so a tracked one got here through a force-add (ONL-2400)',
  },
  {
    kind: 'uncollected-script',
    what: 'a script no collector runs',
    extensions: /\.(ts|tsx|mts|cts|mjs|cjs|js|jsx)$/,
    tiers: [
      {
        dir: 'tests/e2e',
        collected: /(\.e2e\.ts|(\.test|_test|\.spec|_spec)\.(ts|tsx|js|jsx|mjs|cjs|mts|cts))$/,
        libraries: [
          {
            file: 'tests/e2e/contract.ts',
            because: 'the handle contract every spec on the floor drives the DOM through',
          },
          {
            file: 'tests/e2e/launch.ts',
            because: 'the launch and attach library the floor and an agent both build a walk from',
          },
        ],
      },
      {
        dir: 'tests/live',
        collected: /\.live\.ts$/,
        libraries: [
          {
            file: 'tests/live/recording.ts',
            because: 'the redaction and recording library the live suites write their fixtures with',
          },
          {
            file: 'tests/live/replay-divergence.ts',
            because: 'the live-against-replay comparison the live suites assert through',
          },
          {
            file: 'tests/live/tool-fixture.ts',
            because: 'the typed tool fixtures shared by the live harness and its offline unit tests',
          },
        ],
      },
    ],
    remedy: `move it to ${DESTINATION}`,
    because:
      'this directory holds instruments something runs, and a parked one-off reads to the next agent as a live test (ONL-2400)',
  },
];

interface MarkerViolation {
  kind: 'throwaway-marker';
  file: string;
  rule: MarkerRule;
}

interface TierViolation {
  kind: 'uncollected-script';
  file: string;
  tier: Tier;
  rule: TierRule;
}

type Violation = MarkerViolation | TierViolation;

export function violationMessage(violation: Violation): string {
  const where =
    violation.kind === 'uncollected-script' ? ` under ${violation.tier.dir}/` : '';
  return [
    `  ${violation.file}`,
    `    ${violation.rule.what}${where}`,
    `    ${violation.rule.remedy}`,
    `    because ${violation.rule.because}`,
  ].join('\n');
}

function trackedFiles(): string[] {
  const listing = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' });
  return listing.split('\0').filter((path) => path.length > 0);
}

export interface CheckScratchOptions {
  files?: readonly string[];
}

export function checkScratch(options: CheckScratchOptions = {}): {
  scanned: number;
  violations: Violation[];
} {
  const files = options.files ?? trackedFiles();

  if (files.length === 0) {
    throw new Error('check-scratch: scanned 0 files — the tracked set came back empty');
  }

  const violations: Violation[] = [];

  for (const file of files) {
    for (const rule of RULES) {
      if (rule.kind === 'throwaway-marker') {
        if (rule.matches(file)) violations.push({ kind: rule.kind, file, rule });
        continue;
      }
      if (!rule.extensions.test(file)) continue;
      for (const tier of rule.tiers) {
        if (!file.startsWith(`${tier.dir}/`)) continue;
        if (tier.collected.test(file)) continue;
        if (tier.libraries.some((library) => library.file === file)) continue;
        violations.push({ kind: rule.kind, file, tier, rule });
      }
    }
  }

  return { scanned: files.length, violations };
}

if (import.meta.main) {
  const { scanned, violations } = checkScratch();

  if (violations.length === 0) {
    console.log(
      `check-scratch: ${String(scanned)} tracked files scanned, ${String(RULES.length)} rule(s) held.`,
    );
  } else {
    console.log(
      `check-scratch: ${String(violations.length)} violation(s); ${DESTINATION} is where a one-off lives:`,
    );
    for (const violation of violations) {
      console.log(violationMessage(violation));
    }
    process.exitCode = 1;
  }
}
