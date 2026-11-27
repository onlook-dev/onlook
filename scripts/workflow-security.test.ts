import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditWorkflow, auditWorkflowDirectory, workflowFiles } from './workflow-security';

const sha = '11d5960a326750d5838078e36cf38b85af677262';
const safe = `name: Test
on: [pull_request, push, workflow_dispatch]
permissions: {}
jobs:
  verify:
    permissions:
      contents: read
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@${sha}
        with:
          persist-credentials: false
      - run: bun run test:unit
`;

test('public workflow policy covers every repository workflow', () => {
  const directory = join(import.meta.dirname, '../.github/workflows');
  expect(workflowFiles(directory)).toEqual(['ci.yml', 'source-build.yml', 'workflow-lint.yml']);
  expect(auditWorkflowDirectory(directory)).toEqual([]);
});

test('workflow policy accepts credential-free fork CI', () => {
  expect(auditWorkflow(safe)).toEqual([]);
  expect(auditWorkflow(safe.replace('on: [pull_request, push, workflow_dispatch]', 'on: pull_request'))).toEqual([]);
  expect(auditWorkflow(safe.replace('on: [pull_request, push, workflow_dispatch]', 'on:\n  pull_request:'))).toEqual([]);
});

const negativeControls = [
  { name: 'unpinned action', source: safe.replace(`actions/checkout@${sha}`, 'actions/checkout@v4'), failure: 'full commit SHA' },
  { name: 'short action SHA', source: safe.replace(sha, sha.slice(0, 7)), failure: 'full commit SHA' },
  { name: 'local composite action', source: safe.replace(`actions/checkout@${sha}`, './.github/actions/local'), failure: 'full commit SHA' },
  { name: 'mutable docker action', source: safe.replace(`actions/checkout@${sha}`, 'docker://example:latest'), failure: 'full commit SHA' },
  { name: 'pull_request_target head checkout', source: safe.replace('on: [pull_request, push, workflow_dispatch]', 'on:\n  pull_request_target:').replace('persist-credentials: false', 'persist-credentials: false\n          ref: ${{ github.event.pull_request.head.sha }}'), failure: 'Only pull_request' },
  { name: 'privileged trigger shorthand', source: safe.replace('on: [pull_request, push, workflow_dispatch]', 'on: pull_request_target'), failure: 'Only pull_request' },
  { name: 'privileged trigger list', source: safe.replace('on: [pull_request, push, workflow_dispatch]', 'on: [pull_request, pull_request_target]'), failure: 'Only pull_request' },
  { name: 'workflow_run artifact bridge', source: safe.replace('on: [pull_request, push, workflow_dispatch]', 'on:\n  workflow_run:\n    workflows: [CI]\n    types: [completed]'), failure: 'Only pull_request' },
  { name: 'outsider issue comment', source: safe.replace('on: [pull_request, push, workflow_dispatch]', 'on: issue_comment'), failure: 'Only pull_request' },
  { name: 'missing triggers', source: safe.replace('on: [pull_request, push, workflow_dispatch]', 'on: []'), failure: 'Only pull_request' },
  { name: 'workflow token write', source: safe.replace('permissions: {}', 'permissions: write-all'), failure: 'Workflow permissions must be empty' },
  { name: 'missing workflow permissions', source: safe.replace('permissions: {}', ''), failure: 'Workflow permissions must be empty' },
  { name: 'job token write', source: safe.replace('contents: read', 'contents: write'), failure: 'Job permissions' },
  { name: 'job OIDC token', source: safe.replace('contents: read', 'contents: read\n      id-token: write'), failure: 'Job permissions' },
  { name: 'missing job permissions', source: safe.replace('    permissions:\n      contents: read\n', ''), failure: 'Job permissions' },
  { name: 'self-hosted runner', source: safe.replace('ubuntu-24.04', 'self-hosted'), failure: 'GitHub-hosted' },
  { name: 'self-hosted runner list', source: safe.replace('ubuntu-24.04', '[self-hosted, linux]'), failure: 'GitHub-hosted' },
  { name: 'dynamic runner', source: safe.replace('ubuntu-24.04', '${{ matrix.os }}'), failure: 'GitHub-hosted' },
  { name: 'shell event injection', source: safe.replace('bun run test:unit', 'echo "${{ github.event.pull_request.title }}"'), failure: 'environment variables' },
  { name: 'shell context alias injection', source: safe.replace('bun run test:unit', 'echo "${{ env.TITLE }}"'), failure: 'environment variables' },
  { name: 'OAuth secret', source: `${safe}env:\n  TOKEN: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}\n`, failure: 'must not reference secrets' },
  { name: 'indexed secret', source: `${safe}env:\n  TOKEN: \${{ secrets['TOKEN'] }}\n`, failure: 'must not reference secrets' },
  { name: 'secret context export', source: `${safe}env:\n  TOKENS: \${{ toJSON(secrets) }}\n`, failure: 'must not reference secrets' },
  { name: 'formatted secret after a brace', source: `${safe}env:\n  TOKEN: \${{ format('Bearer {0}', secrets.TOKEN) }}\n`, failure: 'must not reference secrets' },
  { name: 'secret after quoted expression delimiters', source: `${safe}env:\n  TOKEN: \${{ format('}} {0}', secrets.TOKEN) }}\n`, failure: 'must not reference secrets' },
  { name: 'job-default shell injection', source: safe.replace('    runs-on:', '    defaults:\n      run:\n        shell: bash -c "${{ github.event.pull_request.title }}" {0}\n    runs-on:'), failure: 'Job shell defaults' },
  { name: 'workflow-default shell injection', source: `${safe}defaults:\n  run:\n    shell: bash -c "\${{ github.event.pull_request.title }}" {0}\n`, failure: 'Workflow shell defaults' },
  { name: 'step shell injection', source: safe.replace('      - run: bun run test:unit', '      - run: bun run test:unit\n        shell: bash -c "${{ github.event.pull_request.title }}" {0}'), failure: 'Step shells' },
  { name: 'checkout dot path alias', source: safe.replace('actions/checkout@', 'actions/checkout/.@'), failure: 'dot segments' },
  { name: 'checkout parent path alias', source: safe.replace('actions/checkout@', 'actions/checkout/subdir/..@'), failure: 'dot segments' },
  { name: 'checkout subpath token persistence', source: safe.replace('actions/checkout@', 'actions/checkout/subdir@').replace('        with:\n          persist-credentials: false\n', ''), failure: 'not persist credentials' },
  { name: 'persisted checkout token', source: safe.replace('persist-credentials: false', 'persist-credentials: true'), failure: 'not persist credentials' },
  { name: 'implicit checkout token persistence', source: safe.replace('        with:\n          persist-credentials: false\n', ''), failure: 'not persist credentials' },
  { name: 'cross-run cache', source: safe.replace(`actions/checkout@${sha}`, `actions/cache@${sha}`), failure: 'Cross-run caches' },
  { name: 'cache restore subaction', source: safe.replace(`actions/checkout@${sha}`, `actions/cache/restore@${sha}`), failure: 'Cross-run caches' },
  { name: 'setup action cache', source: safe.replace('persist-credentials: false', 'persist-credentials: false\n          cache: bun'), failure: 'Cross-run caches' },
  { name: 'secret-backed agent action', source: safe.replace(`actions/checkout@${sha}`, `anthropics/claude-code-action@${sha}`), failure: 'agent actions' },
  { name: 'action script injection', source: safe.replace('persist-credentials: false', 'persist-credentials: false\n          script: ${{ github.event.issue.body }}'), failure: 'Action scripts' },
  { name: 'protected environment on PR job', source: safe.replace('    runs-on:', '    environment: release\n    runs-on:'), failure: 'must not define environment' },
  { name: 'reusable workflow', source: safe.replace('    runs-on:', `    uses: owner/repo/.github/workflows/build.yml@${sha}\n    runs-on:`), failure: 'must not define uses' },
  { name: 'inherited secrets', source: safe.replace('    runs-on:', '    secrets: inherit\n    runs-on:'), failure: 'must not define secrets' },
  { name: 'job container', source: safe.replace('    runs-on:', '    container: node:latest\n    runs-on:'), failure: 'must not define container' },
  { name: 'service container', source: safe.replace('    runs-on:', '    services: {}\n    runs-on:'), failure: 'must not define services' },
  { name: 'missing jobs', source: 'on: pull_request\npermissions: {}', failure: 'must define jobs' },
  { name: 'non-mapping job', source: 'on: pull_request\npermissions: {}\njobs:\n  verify: false', failure: 'Job must be a mapping' },
  { name: 'empty steps', source: safe.replace(/    steps:[\s\S]*/, '    steps: []'), failure: 'must define steps' },
  { name: 'non-mapping step', source: safe.replace('      - run: bun run test:unit', '      - false'), failure: 'must be a mapping' },
  { name: 'step without an action or command', source: safe.replace('      - run: bun run test:unit', '      - name: Empty'), failure: 'exactly one of run or uses' },
  { name: 'step with both an action and command', source: safe.replace('      - run: bun run test:unit', `      - run: bun run test:unit\n        uses: owner/action@${sha}`), failure: 'exactly one of run or uses' },
  { name: 'malformed YAML', source: 'jobs: [', failure: 'valid YAML' },
  { name: 'duplicate YAML permissions', source: `${safe}permissions: write-all\n`, failure: 'valid YAML' },
  { name: 'cyclic YAML alias', source: 'recursive: &cycle\n  cycle: *cycle', failure: 'acyclic' },
];

for (const control of negativeControls) {
  test(`workflow policy rejects ${control.name}`, () => {
    expect(auditWorkflow(control.source).some((failure) => failure.includes(control.failure))).toBe(true);
  });
}

test('workflow policy allows untrusted text only through quoted environment variables', () => {
  const source = safe.replace('      - run: bun run test:unit', '      - run: printf \'%s\\n\' "$TITLE"\n        env:\n          TITLE: ${{ github.event.pull_request.title }}');
  expect(auditWorkflow(source)).toEqual([]);
});

test('workflow policy does not confuse a later secret-scan command with a secret expression', () => {
  const source = safe.replace('name: Test', 'name: Test\nconcurrency:\n  group: ci-${{ github.ref }}').replace('bun run test:unit', 'bun run check:secrets');
  expect(auditWorkflow(source)).toEqual([]);
});

test('workflow directory guard scans both YAML suffixes and rejects an empty inventory', () => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-workflow-policy-'));
  try {
    expect(auditWorkflowDirectory(directory)).toEqual(['No workflow files found']);
    writeFileSync(join(directory, 'safe.yml'), safe);
    writeFileSync(join(directory, 'unsafe.yaml'), safe.replace(`actions/checkout@${sha}`, 'actions/checkout@main'));
    writeFileSync(join(directory, 'README.md'), 'not a workflow');
    expect(workflowFiles(directory)).toEqual(['safe.yml', 'unsafe.yaml']);
    expect(auditWorkflowDirectory(directory)).toEqual(['unsafe.yaml: verify: Step 1 action must be pinned to a full commit SHA']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
