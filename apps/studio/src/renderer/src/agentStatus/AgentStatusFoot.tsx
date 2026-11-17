import { useCallback, useEffect } from 'react';
import { useToast } from '@astryxdesign/core/Toast';

import { isRailHidden, useCanvasStore } from '../canvas/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { t } from '@studio/i18n';
import { statusCollapse, useStatusCollapse } from './collapse.js';
import { CHAT_PLACE, type StatusLine, type StatusWaiting } from './lines.js';
import { StatusList } from './StatusList.js';
import { useStatusLines } from './useStatusLines.js';
import { studio } from '../bridge.js';

function revealChatPlace(place: StatusWaiting): void {
  const canvas = useCanvasStore.getState();
  if (isRailHidden(canvas, 'right')) canvas.toggleRail('right');
  requestAnimationFrame(() => {
    document.querySelector(CHAT_PLACE[place])?.scrollIntoView({ block: 'nearest' });
  });
}

export function AgentStatusFoot(): React.JSX.Element {
  const lines = useStatusLines();
  const flyToFrame = useCanvasStore((state) => state.flyToFrame);
  const showToast = useToast();
  const open = useCallback(
    (line: StatusLine) => {
      studio().telemetryEvent({
        event: 'agent_status_opened',
        properties: {
          ...telemetryProjectFields(),
          state: line.state,
          target: line.target.kind === 'frame' ? 'frame' : line.target.place,
          position: lines.indexOf(line),
          line_count: lines.length,
        },
      });
      if (line.target.kind === 'chat') {
        revealChatPlace(line.target.place);
        return;
      }
      if (!flyToFrame(line.target.frameId)) showToast({ body: t('chat.frameLink.gone'), type: 'info' });
    },
    [lines, flyToFrame, showToast],
  );
  const expand = useCallback(() => {
    studio().telemetryEvent({ event: 'agent_status_expanded', properties: { ...telemetryProjectFields(), line_count: lines.length } });
  }, [lines.length]);
  const collapse = useStatusCollapse((state) => state);
  useEffect(
    () => () => {
      statusCollapse.getState().reset();
    },
    [],
  );
  return (
    <StatusList lines={lines} collapse={collapse} actions={collapse} onOpen={open} onExpand={expand} />
  );
}
