import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const appRequire = createRequire(join(import.meta.dirname, '../apps/studio/package.json'));
const { load } = createRequire(appRequire.resolve('electron-builder'))('js-yaml') as { load(source: string): unknown };
const allowedEvents = new Set(['pull_request', 'push', 'workflow_dispatch']);
const hostedRunners = new Set(['ubuntu-24.04', 'windows-latest']);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function referencesSecrets(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('${{') && /\bsecrets\b/i.test(value);
  if (Array.isArray(value)) return value.some(referencesSecrets);
  return record(value) && Object.values(value).some(referencesSecrets);
}

function shellExpression(defaults: unknown): boolean {
  return record(defaults) && record(defaults.run) && typeof defaults.run.shell === 'string' && defaults.run.shell.includes('${{');
}

export function workflowFiles(directory: string): string[] {
  return readdirSync(directory).filter((file) => /\.ya?ml$/.test(file)).sort();
}

export function auditWorkflow(source: string): string[] {
  const failures: string[] = [];
  let workflow: unknown;
  try {
    workflow = load(source);
  } catch {
    return ['Workflow must be valid YAML'];
  }
  if (!record(workflow)) return ['Workflow must be a mapping'];

  try {
    JSON.stringify(workflow);
  } catch {
    return ['Workflow must be an acyclic YAML mapping'];
  }
  if (referencesSecrets(workflow)) failures.push('Workflow must not reference secrets');
  if (shellExpression(workflow.defaults)) failures.push('Workflow shell defaults must not interpolate expressions');
  if (!record(workflow.permissions) || Object.keys(workflow.permissions).length !== 0) {
    failures.push('Workflow permissions must be empty');
  }
  const trigger = workflow.on;
  const events = typeof trigger === 'string' ? [trigger] : Array.isArray(trigger) ? trigger : record(trigger) ? Object.keys(trigger) : [];
  if (events.length === 0 || events.some((event) => typeof event !== 'string' || !allowedEvents.has(event))) {
    failures.push('Only pull_request, push and workflow_dispatch triggers are allowed');
  }
  if (!record(workflow.jobs) || Object.keys(workflow.jobs).length === 0) return [...failures, 'Workflow must define jobs'];

  for (const [id, job] of Object.entries(workflow.jobs)) {
    const fail = (message: string): void => { failures.push(`${id}: ${message}`); };
    if (!record(job)) {
      fail('Job must be a mapping');
      continue;
    }
    if (!record(job.permissions) || JSON.stringify(job.permissions) !== '{"contents":"read"}') {
      fail('Job permissions must be contents: read only');
    }
    if (typeof job['runs-on'] !== 'string' || !hostedRunners.has(job['runs-on'])) fail('Job must use an approved GitHub-hosted runner');
    if (shellExpression(job.defaults)) fail('Job shell defaults must not interpolate expressions');
    for (const field of ['uses', 'secrets', 'environment', 'container', 'services']) {
      if (field in job) fail(`Job must not define ${field}`);
    }
    if (!Array.isArray(job.steps) || job.steps.length === 0) {
      fail('Job must define steps');
      continue;
    }
    for (const [index, step] of job.steps.entries()) {
      if (!record(step)) {
        fail(`Step ${index + 1} must be a mapping`);
        continue;
      }
      if (Object.hasOwn(step, 'run') === Object.hasOwn(step, 'uses')) {
        fail(`Step ${index + 1} must define exactly one of run or uses`);
      }
      if ('run' in step && (typeof step.run !== 'string' || step.run.includes('${{'))) {
        fail(`Step ${index + 1} must use environment variables instead of shell expressions`);
      }
      if (typeof step.shell === 'string' && step.shell.includes('${{')) fail('Step shells must not interpolate expressions');
      if ('uses' in step) {
        if (typeof step.uses !== 'string' || !/^[\w-]+\/[\w.-]+(?:\/[\w.-]+)*@[a-f0-9]{40}$/.test(step.uses)) {
          fail(`Step ${index + 1} action must be pinned to a full commit SHA`);
          continue;
        }
        const action = step.uses.split('@')[0]!.toLowerCase();
        const segments = action.split('/');
        if (segments.some((segment) => segment === '.' || segment === '..')) fail('Action paths must not contain dot segments');
        const repository = segments.slice(0, 2).join('/');
        const inputs = record(step.with) ? step.with : {};
        if (repository === 'actions/checkout' && inputs['persist-credentials'] !== false) fail('Checkout must not persist credentials');
        if (/cache/.test(action) || 'cache' in inputs || 'cache-dependency-path' in inputs) fail('Cross-run caches are not allowed');
        if (action.startsWith('anthropics/claude-')) fail('Secret-backed agent actions are not allowed');
        if (typeof inputs.script === 'string' && inputs.script.includes('${{')) fail('Action scripts must not interpolate expressions');
      }
    }
  }
  return failures;
}

export function auditWorkflowDirectory(directory: string): string[] {
  const files = workflowFiles(directory);
  if (files.length === 0) return ['No workflow files found'];
  return files.flatMap((file) => auditWorkflow(readFileSync(join(directory, file), 'utf8')).map((failure) => `${file}: ${failure}`));
}
