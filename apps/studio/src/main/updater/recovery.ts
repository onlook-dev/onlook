import { log } from '../log/index.js';
import { defineDomain } from '../state/store.js';
import { gt, valid } from 'semver';

const logger = log('updater');

export function createUpdateRecovery(version: string, root?: () => string) {
  const saved = defineDomain<string | null>({
    name: 'update-authorization-paused',
    version: 2,
    fallback: () => null,
    migrate: () => null,
    root,
  });
  const refused = saved.read();
  return {
    refusedVersion: typeof refused === 'string' && valid(refused) && gt(refused, version) ? refused : null,
    onRefusedVersionChange(refusedVersion: string | null): void {
      try {
        saved.write(refusedVersion);
      } catch (error) {
        logger.warn('could not save update authorization state', { error });
      }
    },
  };
}
