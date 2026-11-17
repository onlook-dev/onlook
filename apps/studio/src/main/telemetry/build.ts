import { OFFICIAL_BUILD } from '../build-kind.js';

export function isSourceBuild(): boolean {
  const cloud = import.meta.env.MAIN_VITE_ONLOOK_CLOUD;
  return cloud === undefined ? !OFFICIAL_BUILD : cloud === 'false';
}

export function telemetryIncluded(): boolean {
  return import.meta.env.MAIN_VITE_TELEMETRY !== 'false';
}
