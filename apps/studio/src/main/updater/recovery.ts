import { log } from '../log/index.js';
import { defineDomain } from '../state/store.js';

const logger = log('updater');

export function createUpdateRecovery(version: string, root?: () => string) {
  const saved = defineDomain<string | null>({
    name: 'update-authorization-paused',
    version: 1,
    fallback: () => null,
    migrate: (data) => typeof data === 'string' ? data : null,
    root,
  });
  return {
    authorizationPaused: saved.read() === version,
    onAuthorizationPauseChange(paused: boolean): void {
      try {
        saved.write(paused ? version : null);
      } catch (error) {
        logger.warn('could not save update authorization state', { error });
      }
    },
  };
}
