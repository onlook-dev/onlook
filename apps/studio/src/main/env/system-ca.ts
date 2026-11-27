import * as tls from 'node:tls';
import { log } from '../log/index.js';

export type CertificateStore = Partial<Pick<typeof tls, 'getCACertificates' | 'setDefaultCACertificates'>>;

const logger = log('env');

export function trustSystemCertificates(store: CertificateStore = tls): void {
  if (typeof store.getCACertificates !== 'function' || typeof store.setDefaultCACertificates !== 'function') {
    logger.warn('system certificates unavailable; using the bundled ones');
    return;
  }
  try {
    const system = store.getCACertificates('system');
    if (system.length === 0) {
      logger.debug('no system certificates found; using the bundled ones');
      return;
    }
    store.setDefaultCACertificates([...new Set([...store.getCACertificates('default'), ...system])]);
  } catch (error) {
    logger.warn('could not trust the system certificates; using the bundled ones', { error });
  }
}
