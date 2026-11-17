import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ChromeSlotAction, ChromeSlotsPush, TabPreview, TabsState } from '@studio/events';
import type { GitDropdownOption } from '@studio/git-ui';

import '../styles.css';
import { installRendererErrorHooks } from '../errors.js';
import { trackInputModality } from '../inputModality.js';
import { trackTooltipWarmth } from '../tooltipWarmth.js';
import { log } from '../log.js';
import { registerStudioIcons } from '../icons/registry.js';
import { RegionErrorBoundary } from '../RegionErrorBoundary.js';
import { htmlLang } from '@studio/i18n';
import { AstryxLanguage } from '../AstryxLanguage.js';
import { TopBar } from './TopBar.js';
import { sendsSlotAction } from './slots.js';
import type { StudioTab } from './tabs/Tab.js';

// Module scope: runs before the first render.
installRendererErrorHooks('chrome');
document.documentElement.lang = htmlLang();
registerStudioIcons();
trackInputModality();
trackTooltipWarmth();
log('renderer').info('chrome view mounted');

const previewTab = (id: string): Promise<TabPreview> => window.studioChrome.tabPreview(id);

const EMPTY: TabsState = { tabs: [], canCreate: false, isHome: true };

function Chrome(): React.JSX.Element {
  const [state, setState] = useState<TabsState>(EMPTY);
  const [projection, setProjection] = useState<ChromeSlotsPush>({ tabId: '', slots: {} });
  // Starting blurred would flash the stand-in lights under the real ones.
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isChordHintHeld, setIsChordHintHeld] = useState(false);

  useEffect(() => {
    const offTabs = window.studioChrome.onTabsChanged(setState);
    const offSlots = window.studioChrome.onSlots(setProjection);
    const offFocus = window.studioChrome.onWindowFocus((focus) => setIsWindowFocused(focus.isFocused));
    const offChord = window.studioChrome.onChordHint((hint) => setIsChordHintHeld(hint.isHeld));
    // Answered from a record main already holds, not a data read at mount (ONL-1948).
    void window.studioChrome.tabsState().then(setState);
    void window.studioChrome.windowFocus().then((focus) => setIsWindowFocused(focus.isFocused));
    return () => {
      offTabs();
      offSlots();
      offFocus();
      offChord();
    };
  }, []);

  const activeId = state.activeId ?? state.tabs[0]?.id ?? '';
  const slots = projection.slots;
  // Keyed on the tab's purpose, not on whether its project exists: that withheld the chip for the whole worktree cut (ONL-2244).
  const tabs: StudioTab[] = state.tabs.filter((tab) => tab.purpose === 'project').map((tab) => ({
    id: tab.id,
    name: tab.name,
    ...(tab.isWorking === undefined ? {} : { isWorking: tab.isWorking }),
    ...(tab.status === undefined ? {} : { status: tab.status }),
    ...(tab.health === undefined ? {} : { health: tab.health }),
  }));

  const act = (action: ChromeSlotAction): void => {
    if (sendsSlotAction(action, { activeId, projectedTabId: projection.tabId })) {
      window.studioChrome.action(action);
    }
  };

  return (
    <TopBar
      windowControls={window.studioChrome.windowControls}
      tabs={tabs}
      activeTabId={activeId}
      canCreate={state.canCreate}
      isHome={state.isHome}
      isWindowFocused={isWindowFocused}
      isChordHintHeld={isChordHintHeld}
      onSelectTab={(id) => window.studioChrome.selectTab(id)}
      onCloseTab={(id) => window.studioChrome.closeTab(id)}
      onNewTab={() => window.studioChrome.newTab()}
      onNewDraft={() => window.studioChrome.newDraft()}
      isCreatingDraft={state.isCreatingDraft === true}
      canReopen={state.canReopen === true}
      onReopenTab={() => window.studioChrome.reopenTab()}
      onRenameTab={(id, name) => window.studioChrome.renameTab(id, name)}
      onReorderTab={(id, toIndex) => window.studioChrome.reorderTab(id, toIndex)}
      onReloadTab={(id) => window.studioChrome.reloadTab(id)}
      onPreviewTab={previewTab}
      slots={slots}
      onFolder={() => act({ tabId: activeId, slot: 'folder' })}
      onToggleRail={(side) => act({ tabId: activeId, slot: 'rail', side })}
      onGitAction={() => act({ tabId: activeId, slot: 'git', kind: 'action' })}
      onGitPick={(option: GitDropdownOption) =>
        act({ tabId: activeId, slot: 'git', kind: 'pick', option })
      }
    />
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from chrome.html');
createRoot(container).render(
  <StrictMode>
    <AstryxLanguage>
      <RegionErrorBoundary region="chrome">
        <Chrome />
      </RegionErrorBoundary>
    </AstryxLanguage>
  </StrictMode>,
);

// Half of the show gate: the window appears once this band and the first tab's surface have both committed (ONL-1948).
window.studioChrome.uiReady();
