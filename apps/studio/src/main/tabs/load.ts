import { join } from 'node:path';
import type { WebContents } from 'electron';
import { is } from '@electron-toolkit/utils';
import { identity as providerIdentity } from '@onlook/cloud-provider';
import {
  DIAGNOSTICS_HASH,
  birthQuery,
  birthSearch,
  encodeCapabilities,
  type TabBirthFacts,
  type TabBirthPurpose,
} from '@studio/events';
import { capabilities } from '../cloud/capabilities.js';
import { diagnosticsGateOpen } from '../diagnostics/gate.js';
import { rendererDevServerUrl } from '../env/dev-switches.js';
import { readPanels } from '../panels/state.js';
import { logger } from './log.js';

/** The rejection is the same fact `did-fail-load` already records; unhandled, it would be a second report. */
function loaded(promise: Promise<void>, what: string): void {
  promise.catch((error: unknown) => logger.warn('load rejected', { what, error }));
}

export function loadChrome(contents: WebContents): void {
  const caps = encodeCapabilities(capabilities());
  const devServerUrl = rendererDevServerUrl();
  if (is.dev && devServerUrl) {
    loaded(contents.loadURL(`${devServerUrl}/chrome.html?${new URLSearchParams({ caps }).toString()}`), 'chrome');
    return;
  }
  loaded(contents.loadFile(join(import.meta.dirname, '../renderer/chrome.html'), { query: { caps } }), 'chrome');
}

function diagnosticsHash(): string {
  return diagnosticsGateOpen() ? DIAGNOSTICS_HASH : '';
}

/** One constructor, so a new tab cannot be born without the facts its first paint decides from (ONL-2780, ONL-2318). */
export function birthFacts(tabId: string, purpose: TabBirthPurpose): TabBirthFacts {
  return { tabId, purpose, panels: readPanels(), requiresSession: providerIdentity.configured(), capabilities: capabilities() };
}

/** Birth facts ride the query; the hash is the dev-instrument channel the diagnostics gate rides (ONL-2372, ONL-2318). */
export function loadTab(contents: WebContents, facts: TabBirthFacts): void {
  const devServerUrl = rendererDevServerUrl();
  const hash = diagnosticsHash();
  if (is.dev && devServerUrl) {
    loaded(contents.loadURL(`${devServerUrl}/?${birthSearch(facts)}${hash}`), 'tab');
    return;
  }
  loaded(
    contents.loadFile(join(import.meta.dirname, '../renderer/index.html'), {
      query: birthQuery(facts),
      // `slice(1)` because `loadFile` prepends the `#` itself; passing `#debug` here yields `##debug` and the gate never opens.
      ...(hash === '' ? {} : { hash: hash.slice(1) }),
    }),
    'tab',
  );
}
