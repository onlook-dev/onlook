import { useState } from 'react';

/** A hover seen under one set of tabs is dropped when they change: a tab composed under a still pointer sends no mouseleave. */
export function useStripHover(stripKey: string): readonly [string | undefined, (id: string | undefined) => void] {
  const [hover, setHover] = useState<{ stripKey: string; id?: string }>({ stripKey });
  if (hover.stripKey !== stripKey) setHover({ stripKey });
  const set = (id: string | undefined): void => setHover(id === undefined ? { stripKey } : { stripKey, id });
  return [hover.stripKey === stripKey ? hover.id : undefined, set];
}
