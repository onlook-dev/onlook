import { useCallback, useEffect, useRef, useState } from 'react';
import type { CodeReadResult } from '@studio/events';
import { studio } from '../bridge.js';

interface Preview {
  scope: string | undefined;
  path: string;
  result: CodeReadResult | null;
}

const readFile = (path: string): Promise<CodeReadResult> => studio().codeRead({ path });

export function useTouchedFilePreview(scope: string | undefined, read: (path: string) => Promise<CodeReadResult> = readFile): {
  path: string | null;
  result: CodeReadResult | null;
  open: (path: string) => void;
  close: () => void;
} {
  const [preview, setPreview] = useState<Preview | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setPreview(null);
    return () => { generation.current += 1; };
  }, [scope]);
  const close = useCallback(() => {
    generation.current += 1;
    setPreview(null);
  }, []);
  const open = useCallback((path: string) => {
    const request = ++generation.current;
    setPreview({ scope, path, result: null });
    void read(path).catch((): CodeReadResult => ({ ok: false, code: 'unreadable' })).then((result) => {
      if (generation.current === request) setPreview({ scope, path, result });
    });
  }, [scope, read]);
  const shown = preview?.scope === scope ? preview : null;
  return { path: shown?.path ?? null, result: shown?.result ?? null, open, close };
}
