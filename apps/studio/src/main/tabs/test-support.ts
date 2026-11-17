import { composeTabs, type TabPieces, type TabSeams } from './compose.js';
import { TabHost } from './host.js';
import type { PresentationMachine, PresentationRefusal } from './presentation-machine.js';
import { TabWindow } from './window.js';

/** The event a view's own main frame sends, as the door's view guard reads it. */
export function fromMainFrame<T extends object>(contents: T): { sender: T; senderFrame: object } {
  const sender = contents as T & { mainFrame?: object };
  sender.mainFrame ??= {};
  return { sender, senderFrame: sender.mainFrame };
}

/** The event a frame under the view's main frame would send, had it a bridge to send with. */
export function fromSubframe<T extends object>(contents: T): { sender: T; senderFrame: object } {
  return { sender: contents, senderFrame: { parent: fromMainFrame(contents).senderFrame, isDestroyed: () => false } };
}

/** Seats the Tab on screen for a suite that starts mid-flight, through the machine's own door. */
export function seatShownTab(presentation: TabPieces['presentation'], id: string | undefined): void {
  const { machine } = presentation as unknown as { machine: PresentationMachine };
  if (id !== undefined) machine.dispatch({ type: 'shown', tabId: id });
  else if (machine.shown !== undefined) machine.dispatch({ type: 'forgotten', tabId: machine.shown });
}

type Piece = keyof TabPieces | 'host' | 'seams';

/** Where each name the host-level suites seat or read lives now: the piece that owns it, and its name there when that changed. */
const SEATS: Record<string, readonly [Piece, string?]> = {
  tabs: ['book'], order: ['book'], activeId: ['book'], seq: ['book'], isBooting: ['book'], saved: ['book'],
  tabById: ['book'], tabFor: ['book'], tabForViewId: ['book'], tabForWorkspace: ['book'], contentsFor: ['book'], activeContents: ['book'],
  purposeOf: ['book'], projectTabCount: ['book'], decisionsFor: ['book'], hasReachedProduct: ['book'], isUsable: ['book'], heldByAnotherTab: ['book'],
  sourceForActive: ['book'], createFromFor: ['book'], nextTabId: ['book'], persistWindows: ['book', 'persist'],
  window: ['window'], chrome: ['window'], body: ['window', 'bodyBounds'], isQuitting: ['window'], raiseChrome: ['window'], attach: ['window'],
  layout: ['window'], expand: ['window'], pushSlots: ['window'],
  cooling: ['views'], spare: ['views'], newView: ['views'], destroyView: ['views'], observeHealth: ['views'], reload: ['views'],
  resume: ['views'], cool: ['views'], teardown: ['views'], everyRenderer: ['views'], takeSpare: ['views'], scheduleSpare: ['views'],
  slots: ['presentation'], cover: ['presentation', 'coverRig'], presenting: ['presentation', 'deadlineTimer'], present: ['presentation'],
  reveal: ['presentation'], revealWhenPainted: ['presentation'], showLoading: ['presentation'], warm: ['presentation'], forgetWarm: ['presentation'],
  assign: ['presentation'], assignmentFrom: ['presentation'], publishVisibleSlots: ['presentation'], isTabShown: ['presentation'],
  handleSlots: ['presentation'], warmRestored: ['presentation'], freezeTab: ['presentation'], rekey: ['presentation'], holdBack: ['presentation'],
  dropCover: ['presentation'], viewDiscarded: ['presentation'], requestFirstPaint: ['presentation'], endWatch: ['presentation'],
  pushOnScreen: ['presence'], noteActiveProjectShown: ['presence'], onScreenFrom: ['presence'], presenceFor: ['presence'],
  activation: ['activation'], wakingId: ['activation'], activate: ['activation'],
  isCreatingDraft: ['opens'], draftRequestFor: ['opens'], createInTab: ['opens'], duplicateInTab: ['opens'], startCreate: ['opens'],
  retryCreate: ['opens'], dismissCreate: ['opens'], setDraftCreating: ['opens'], beginDraftCreation: ['opens'], reserveProjectOpen: ['opens'],
  releaseProjectOpen: ['opens'], newDraft: ['opens'], takeDraftRequest: ['opens'], isAtProjectLimit: ['opens'], noteWorkspace: ['opens'],
  closed: ['closer'], close: ['closer'], requestClose: ['closer'], closeForWorkspace: ['closer'], closeActive: ['closer'], reopenClosed: ['closer'],
  open: ['opener'], openFromActive: ['opener'], openBackground: ['opener'], goHome: ['opener'], revealWorkspace: ['opener'], restore: ['opener'], restoreSaved: ['opener'],
  state: ['strip'], broadcastTabs: ['strip', 'broadcast'], noteWorking: ['strip'], noteStatus: ['strip'], noteContext: ['strip'], reorder: ['strip'],
  followSettingsRequest: ['settingsRequest', 'follow'],
  confirmClose: ['seams'], retire: ['seams'],
  handleAction: ['host'], handleCommand: ['host'], revealSettings: ['host'], takeSettingsRequest: ['host'], armSpare: ['host'], beginQuit: ['host'],
};

/**
 * The tab host as `compose.ts` wires it, with no window behind it, for the suites that seat a
 * few fields and drive one path. A name is seated on, read from and called on the piece that
 * owns it, so a stand-in handed here is the one every piece reaches. A name `SEATS` does not
 * hold throws, in either direction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the suites reach private state by name, as they did on the single class.
export function seatedTabs(seats: Record<string, unknown> = {}): any {
  const seams: TabSeams = {
    window: (events) => Object.assign(Object.create(TabWindow.prototype) as TabWindow, { events }),
    saved: undefined,
    confirmClose: async () => true,
    retire: () => undefined,
  };
  const pieces = composeTabs(seams);
  pieces.book.finishBoot();
  const host = Object.assign(Object.create(TabHost.prototype) as TabHost, { pieces });
  const owners: Record<Piece, object> = { ...pieces, host, seams };
  const { machine } = pieces.presentation as unknown as { machine: PresentationMachine };
  // A step the machine refuses is a gap in its table or a path that should not exist: here it fails the suite, where the app only logs it.
  Object.assign(machine, {
    refused: (refusal: PresentationRefusal): void => {
      throw new Error(`the presentation machine refused \`${refusal.event}\` in phase \`${refusal.phase}\``);
    },
  });
  const seat = (name: string): { owner: Record<string, unknown>; key: string } => {
    const at = SEATS[name];
    if (at === undefined) throw new Error(`seatedTabs: no piece is known to own \`${name}\``);
    return { owner: owners[at[0]] as Record<string, unknown>, key: at[1] ?? name };
  };
  const seated = new Proxy({}, {
    get: (_target, name) => {
      if (typeof name !== 'string' || name === 'then') return undefined;
      if (name === 'pieces') return pieces;
      if (name === 'visibleId') return machine.shown;
      const { owner, key } = seat(name);
      const value = owner[key];
      // A stand-in a suite seated is handed back as it is, so the suite can assert on it; a piece's own method keeps its piece.
      return typeof value === 'function' && !Object.hasOwn(owner, key) ? value.bind(owner) : value;
    },
    set: (_target, name, value) => {
      if (name === 'visibleId') {
        seatShownTab(pieces.presentation, value as string | undefined);
        return true;
      }
      const { owner, key } = seat(String(name));
      owner[key] = value;
      return true;
    },
    deleteProperty: (_target, name) => {
      const { owner, key } = seat(String(name));
      return delete owner[key];
    },
  });
  Object.assign(seated, seats);
  return seated;
}
