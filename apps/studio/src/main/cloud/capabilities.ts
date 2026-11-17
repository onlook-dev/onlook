import * as provider from '@onlook/cloud-provider';
import { boundCapabilities, type StudioCapabilities } from '@studio/events';
import { OFFICIAL_BUILD } from '../build-kind.js';
import { proofSwitchOn } from '../diagnostics/gate.js';
import type { CloudIdentity } from './client.js';

/** A provider built before `capabilities` exports none, and gets the answers the build switches and its own `enabled()` gave before it. */
function buildCapabilities(module: object): StudioCapabilities {
  const cloud = import.meta.env.MAIN_VITE_ONLOOK_CLOUD === 'true';
  const identity = Reflect.get(module, 'identity') as Partial<CloudIdentity> | undefined;
  const account = typeof identity?.enabled === 'function' ? identity.enabled() : cloud;
  return { account, teams: cloud, github: cloud, report: cloud, survey: cloud, updates: OFFICIAL_BUILD, links: OFFICIAL_BUILD };
}

export function resolveCapabilities(module: object): StudioCapabilities {
  // Read by key: a named import of an export an older provider lacks fails its build.
  const declared: unknown = Reflect.get(module, 'capabilities');
  return declared === undefined ? buildCapabilities(module) : boundCapabilities(declared);
}

export function capabilities(): StudioCapabilities {
  const resolved = resolveCapabilities(provider);
  // A proof run installs its own GitHub broker or report sink, so its switch stands in for the provider's.
  return { ...resolved, github: resolved.github || proofSwitchOn('STUDIO_GITHUB_PROOF'), report: resolved.report || proofSwitchOn('STUDIO_REPORT_PROOF') };
}
