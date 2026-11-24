import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AgentCommandAcceptance, PermissionMode } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { permissionModeControls, type ComposerPermissionControl } from './composerControls.js';

export function usePermissionControl({ mode, offered, sessionKey, setMode }: {
  mode?: PermissionMode;
  offered: readonly PermissionMode[];
  sessionKey: string;
  setMode: (mode: PermissionMode) => Promise<AgentCommandAcceptance>;
}): ComposerPermissionControl {
  const [pending, setPending] = useState<{ mode: PermissionMode; request: number; confirmed: boolean }>();
  const latest = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  useLayoutEffect(() => {
    generation.current += 1;
    latest.current += 1;
    writes.current = Promise.resolve();
    setPending(undefined);
    return () => { generation.current += 1; };
  }, [sessionKey]);
  useEffect(() => {
    if (pending?.confirmed && pending.mode === mode) setPending(undefined);
  }, [pending, mode]);
  return permissionModeControls({
    mode: pending?.mode ?? mode,
    offered,
    setMode: (next) => {
      const request = ++latest.current;
      const owner = generation.current;
      setPending({ mode: next, request, confirmed: false });
      writes.current = writes.current.then(async () => {
        if (generation.current !== owner) return;
        const acceptance = await setMode(next).catch((error: unknown) => { ignoreRefusal('chat', 'setPermissionMode')(error); return { accepted: false }; });
        if (generation.current !== owner || latest.current !== request) return;
        setPending((choice) => {
          if (choice?.request !== request) return choice;
          return acceptance.accepted ? { ...choice, confirmed: true } : undefined;
        });
      });
    },
  });
}
