import type { CpuFamily } from './events.js';
import { hostPlatform, isMac } from '../env/platform.js';

export function cpuFamily(model: string | undefined): CpuFamily {
  const [vendor, chip] = model?.trim().toLowerCase().split(/\s+/) ?? [];
  if (vendor === 'apple') {
    if (chip === 'm1' || chip === 'm2' || chip === 'm3' || chip === 'm4') return `apple-${chip}`;
    return 'apple-other';
  }
  return /\bintel\b/i.test(model ?? '') ? 'intel' : 'other';
}

export function underRosetta(
  app: { readonly runningUnderARM64Translation?: boolean },
  platform: NodeJS.Platform = hostPlatform(),
): boolean {
  return isMac(platform) && app.runningUnderARM64Translation === true;
}
