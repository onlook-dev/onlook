import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useCanvasStore } from '../canvas/store.js';
import { designRowFacts } from '../sidebar/designRow.js';
import { statusLines, statusSubject, type StatusLine, type StatusSubject } from './lines.js';
import { useAgentStatusStore } from './store.js';

export function useStatusLines(): StatusLine[] {
  const status = useAgentStatusStore((state) => state.status);
  const waiting = useAgentStatusStore((state) => state.waiting);
  const subjects = useCanvasStore(
    useShallow((state) =>
      status.frameIds.flatMap((id) => {
        const node = state.nodes.find((candidate) => candidate.id === id);
        if (node === undefined) return [undefined, undefined];
        const subject = statusSubject(designRowFacts(node));
        return [subject.name, subject.noun];
      }),
    ),
  );
  return useMemo(() => {
    const byId = new Map(status.frameIds.map((id, index): [string, StatusSubject | undefined] => {
      const name = subjects[index * 2];
      const noun = subjects[index * 2 + 1] as StatusSubject['noun'];
      return [id, name === undefined ? undefined : { name, ...(noun === undefined ? {} : { noun }) }];
    }));
    return statusLines(status, waiting, (id) => byId.get(id));
  }, [status, waiting, subjects]);
}
