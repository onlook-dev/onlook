import {
  APP_COMMAND_ORDER,
  GIT_PILL_SHIPPED_DEFAULTS,
  IDLE_UPDATE_STATE,
  MAX_PROJECT_TABS,
  type ChromeSlotsPush,
  type StudioChromeBridge,
  type TabsState,
  type UpdateState,
  type WindowControlsEdge,
} from '@studio/events';
import type { GitPillStateId } from '@studio/git-ui';
import { MEASUREMENT_FIXTURES, row } from '@studio/git-ui/measurement-fixtures';
import { seedCapabilities } from '@renderer/capabilities.js';

const LAB_GIT_STATE: GitPillStateId = (import.meta.env.VITE_LAB_GIT_STATE as GitPillStateId) ?? 'create-pr';

const labUpdate = new URLSearchParams(window.location.search);
const LAB_UPDATE_STATE: UpdateState = labUpdate.has('update')
  ? {
      status: (labUpdate.get('update') === 'cycle' ? 'checking' : labUpdate.get('update')) as UpdateState['status'],
      version: '0.4.2',
      percent: Number(labUpdate.get('percent') ?? 42),
    }
  : IDLE_UPDATE_STATE;

/** `?windows` draws the band as Windows does; `?screen=onboarding` blends it into the page. */
const LAB_WINDOW_CONTROLS: WindowControlsEdge = labUpdate.has('windows') ? 'trailing' : 'leading';
const isLabOnboarding = labUpdate.get('screen') === 'onboarding';

let state: TabsState = {
  tabs: [
    { id: 'a', name: 'marketing-site', purpose: 'project' },
    { id: 'b', name: 'checkout-flow', purpose: 'project', isWorking: true, status: 'working' },
    { id: 'c', name: 'design-system', purpose: 'project', status: 'done' },
    { id: 'd', name: 'pricing-page', purpose: 'project', status: 'waiting' },
    { id: 'e', name: 'docs-site', purpose: 'project' },
    { id: 'f', name: 'admin-console', purpose: 'project' },
  ],
  activeId: 'a',
  canCreate: true,
  isHome: isLabOnboarding,
};

const slots: ChromeSlotsPush = {
  tabId: 'a',
  slots: isLabOnboarding ? { blendsIntoScreen: true } : {
    showFolder: true,
    rails: { left: false, right: false },
    /* Seeded, or the band sits in first paint forever. */
    git: {
      defaults: { ...GIT_PILL_SHIPPED_DEFAULTS, noPr: LAB_GIT_STATE === 'push' ? 'push' : 'create-pr' },
      row: row(MEASUREMENT_FIXTURES[LAB_GIT_STATE]),
      isWorking: false,
      canSubmit: true,
    },
  },
};

const tabListeners = new Set<(next: TabsState) => void>();
const push = (next: TabsState): void => {
  state = next;
  for (const listener of tabListeners) listener(state);
};

const slotListeners = new Set<(next: ChromeSlotsPush) => void>();
const pushSlots = (next: ChromeSlotsPush['slots']): void => {
  slots.slots = next;
  for (const listener of slotListeners) listener({ ...slots });
};

let created = 0;

const bridge: StudioChromeBridge = {
  windowControls: LAB_WINDOW_CONTROLS,
  tabsState: async () => state,
  onTabsChanged: (listener) => {
    tabListeners.add(listener);
    return () => tabListeners.delete(listener);
  },
  onSlots: (listener) => {
    slotListeners.add(listener);
    queueMicrotask(() => {
      if (slotListeners.has(listener)) listener(slots);
    });
    return () => slotListeners.delete(listener);
  },
  windowFocus: async () => ({ isFocused: true }),
  onWindowFocus: () => () => undefined,
  /* The app's chrome view never has the keyboard, so main reads ⌘; here the band is the page and watches its own keys. */
  onChordHint: (listener) => {
    const update = (event: KeyboardEvent): void => {
      listener({ isHeld: event.metaKey && !event.altKey && !event.shiftKey && !event.ctrlKey });
    };
    const clear = (): void => {
      listener({ isHeld: false });
    };
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('blur', clear);
    };
  },

  selectTab: (tabId) => {
    if ((state.activeId === tabId && !state.isHome) || !state.tabs.some((tab) => tab.id === tabId)) return;
    push({ ...state, activeId: tabId, isHome: false });
    pushSlots({ ...slots.slots, rails: { left: false, right: false } });
  },
  closeTab: (tabId) => {
    if (!state.tabs.some((tab) => tab.id === tabId)) return;
    const tabs = state.tabs.filter((tab) => tab.id !== tabId);
    push({ ...state, tabs, activeId: state.activeId === tabId ? tabs.at(-1)?.id : state.activeId, canCreate: tabs.length < MAX_PROJECT_TABS });
  },
  reopenTab: () => undefined,
  newDraft: () => undefined,
  newTab: () => {
    created += 1;
    const tab = { id: `new-${created}`, name: 'Untitled', purpose: 'project' as const };
    if (!state.canCreate) return;
    const tabs = [...state.tabs, tab];
    push({ ...state, tabs, activeId: tab.id, canCreate: tabs.length < MAX_PROJECT_TABS });
  },
  reorderTab: (tabId, toIndex) => {
    const visible = state.tabs.filter((tab) => tab.purpose === 'project');
    const from = visible.findIndex((tab) => tab.id === tabId);
    if (from === -1 || from === toIndex) return;
    const moved = visible.filter((tab) => tab.id !== tabId);
    moved.splice(Math.max(0, Math.min(toIndex, visible.length - 1)), 0, visible[from]!);
    let next = 0;
    push({ ...state, tabs: state.tabs.map((tab) => (tab.purpose === 'project' ? moved[next++]! : tab)) });
  },
  renameTab: (tabId, name) => {
    const tab = state.tabs.find((candidate) => candidate.id === tabId);
    if (tab === undefined || tab.name === name) return;
    push({ ...state, tabs: state.tabs.map((candidate) => (candidate.id === tabId ? { ...candidate, name } : candidate)) });
  },
  action: ({ slot }) => {
    if (slot !== 'folder') return;
    push({ ...state, isHome: true });
    const { rails: _rails, ...rest } = slots.slots;
    pushSlots(rest);
  },

  // Already as tall as any claim, so `viewportReaches` does not spin.
  expandChrome: async () => ({ height: window.innerHeight }),
  tabPreview: async () => ({}),

  updateStatus: async (): Promise<UpdateState> => LAB_UPDATE_STATE,
  onUpdateState: (listener) => {
    const cycle = labUpdate.get('update') === 'cycle';
    if (!cycle && LAB_UPDATE_STATE.status !== 'downloading') return () => undefined;
    let tick = 0;
    let percent = LAB_UPDATE_STATE.percent ?? 0;
    const timer = window.setInterval(() => {
      if (!cycle) {
        percent = percent >= 100 ? 0 : percent + 1;
        listener({ ...LAB_UPDATE_STATE, percent });
        return;
      }
      tick = (tick + 1) % 130;
      if (tick < 10) listener({ status: 'checking' });
      else if (tick <= 110) listener({ status: 'downloading', version: '0.4.2', percent: tick - 10 });
      else listener({ status: 'downloaded', version: '0.4.2' });
    }, 150);
    return () => window.clearInterval(timer);
  },
  updateRestart: () => undefined,
  appCommands: async () => APP_COMMAND_ORDER,
  runAppCommand: () => undefined,
  runHelpAction: () => undefined,

  uiReady: () => undefined,
  log: () => undefined,
  reloadTab: () => undefined,
  telemetryException: () => undefined,
};

window.studioChrome = bridge;
seedCapabilities({ account: true, teams: true, github: true, report: true, survey: true });
