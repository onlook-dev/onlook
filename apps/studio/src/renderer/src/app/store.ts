import { create } from 'zustand';
import type { AppInfo } from '@studio/events';
import { studio } from '../bridge.js';

interface AppInfoStore {
  version: string | undefined;
  tipsEveryProject: boolean;
  tipMomentGapMs: number | undefined;
}

const useAppInfoStore = create<AppInfoStore>()(() => ({ version: undefined, tipsEveryProject: false, tipMomentGapMs: undefined }));

let priming: Promise<void> | undefined;

export function primeAppInfo(): Promise<void> {
  priming ??= (async () => {
    const info = await studio()
      .appInfo()
      .catch((): AppInfo | undefined => undefined);
    if (info !== undefined) useAppInfoStore.setState({ version: info.version, tipsEveryProject: info.tipsEveryProject === true, tipMomentGapMs: info.tipMomentGapMs });
  })();
  return priming;
}

export { useAppInfoStore };
