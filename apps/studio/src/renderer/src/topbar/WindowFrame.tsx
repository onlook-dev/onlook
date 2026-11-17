import { useEffect, type ReactNode } from 'react';
import type { WebviewTag } from 'electron';
import { VStack } from '@astryxdesign/core/Layout';

import { dispatchCanvasRedo, dispatchCanvasUndo } from '../canvas/historyDispatch.js';
import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';
import { studio } from '../bridge.js';

/** The top band is the chrome view's content in another process, not this tab view's (ONL-2206). */
export function WindowFrame({ children }: { children: ReactNode }): React.JSX.Element {
  // Seated on the view, not a surface: text undo must work where no canvas is mounted (ONL-2042).
  useEffect(() => {
    const dispatchEditCommand = (command: 'undo' | 'redo'): void => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.tagName === 'WEBVIEW') {
        // The menu's key equivalent consumed the chord, so the guest saw no keydown; a no-op here leaves ⌘Z dead in guest editables.
        (active as WebviewTag)[command]();
        return;
      }
      if (isInteractiveTarget(active)) {
        document.execCommand(command);
        return;
      }
      if (command === 'undo') dispatchCanvasUndo();
      else dispatchCanvasRedo();
    };
    const offUndo = studio().onEditUndo(() => dispatchEditCommand('undo'));
    const offRedo = studio().onEditRedo(() => dispatchEditCommand('redo'));
    return () => {
      offUndo();
      offRedo();
    };
  }, []);

  return (
    <VStack width="100%" height="100%" gap={0}>
      {children}
    </VStack>
  );
}
