import {
  GIT_PILL_SHIPPED_DEFAULTS,
  type GitNoPrDefault,
  type GitPillDefaults,
  type GitPillDefaultsPatch,
  type GitReadyDefault,
} from '@studio/events';
import { defineDomain } from '../state/store.js';

const NO_PR: readonly GitNoPrDefault[] = ['create-pr', 'push'];
const READY: readonly GitReadyDefault[] = ['open-in-browser', 'merge'];

const domain = defineDomain<GitPillDefaults>({
  name: 'git-pill-defaults',
  version: 1,
  fallback: () => ({ ...GIT_PILL_SHIPPED_DEFAULTS }),
  migrate: (_data, from) => {
    throw new Error(`no migration from version ${String(from)}`);
  },
});

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value);

function sanitize(value: unknown): GitPillDefaults {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    noPr: oneOf(v['noPr'], NO_PR) ? v['noPr'] : GIT_PILL_SHIPPED_DEFAULTS.noPr,
    ready: oneOf(v['ready'], READY) ? v['ready'] : GIT_PILL_SHIPPED_DEFAULTS.ready,
  };
}

export function readGitPillDefaults(): GitPillDefaults {
  return sanitize(domain.read());
}

export function writeGitPillDefaults(patch: GitPillDefaultsPatch): GitPillDefaults {
  const next = sanitize({ ...readGitPillDefaults(), ...patch });
  domain.write(next);
  return next;
}

export function resetGitPillDefaultsCache(): void {
  domain.reset();
}
