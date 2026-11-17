import { join } from 'node:path';
import electron, { BaseWindow, WebContentsView, screen, type NativeImage, type WebContents } from 'electron';
import {
  IPC_EMIT,
  WINDOW_BAR_HEIGHT,
  type ChromeExtent,
  type ChromeExtentApplied,
  type ChromeSlots,
  type ChromeSlotsPush,
} from '@studio/events';
import { t } from '@studio/i18n';
import { trackWorkActivity } from '../background-work/window.js';
import { hasOnlookSession } from '../cloud/access.js';
import { diagnosticsArguments } from '../diagnostics/gate.js';
import { isMac } from '../env/platform.js';
import { rememberWindow, restoreWindowOptions, wasMaximized } from '../window/bounds.js';
import { protectAppContents } from '../window/host.js';
import { appViewPreferences } from '../window/preferences.js';
import { DRAWS_CAPTION_BUTTONS, captionButtonsFor } from './caption-buttons.js';
import { chromeHeightFor, restOnNewDocument } from './extent.js';
import { loadChrome } from './load.js';
import { send } from './send.js';
import { slotsForSession } from './slot-book.js';

export function viewPreferences(preload: string, extra: Electron.WebPreferences = {}): Electron.WebPreferences {
  return appViewPreferences(preload, {
    // The preload cannot read `app.isPackaged`, so main's answer arrives as argv (ONL-2377).
    additionalArguments: diagnosticsArguments(),
    // `backgroundThrottling: false` is left out: a hidden tab's timers recover within 2s, and it cost `capture_frame` 17x (ONL-2304).
    ...extra,
  });
}

/** What the rest of the tab host does when the window moves; each is called after the window's own part. */
export interface TabWindowEvents {
  /** The band has been told whether the window has focus. */
  focusTold(isFocused: boolean): void;
  /** The window gained or lost focus. */
  focusChanged(isFocused: boolean): void;
  /** The rectangle every Tab view fills was worked out again. */
  laidOut(body: Electron.Rectangle): void;
  closed(): void;
}

/** The window and its band: built, sized and remembered here, and the place every Tab view is attached to. */
export class TabWindow {
  readonly window: BaseWindow;

  private readonly chrome: WebContentsView;
  private readonly events: TabWindowEvents;
  private extent: ChromeExtent = { kind: 'band' };
  private bodyBounds: Electron.Rectangle = { x: 0, y: WINDOW_BAR_HEIGHT, width: 0, height: 0 };
  private captionFill: string | undefined;
  private isQuitting = false;

  constructor(events: TabWindowEvents) {
    this.events = events;
    const displays = screen.getAllDisplays().map((display) => display.workArea);
    this.window = new BaseWindow({
      ...restoreWindowOptions(displays),
      title: t('app.name'),
      minWidth: 960,
      minHeight: 600,
      show: false,
      titleBarStyle: isMac() ? 'hiddenInset' : DRAWS_CAPTION_BUTTONS ? 'hidden' : 'default',
      ...(DRAWS_CAPTION_BUTTONS ? { titleBarOverlay: captionButtonsFor({}) } : {}),
      backgroundColor: '#0a0a0a',
      // Only a non-opaque window drops the hairline macOS draws over an opaque titled window's top edge.
      transparent: isMac(),
    });

    trackWorkActivity(this.window, electron.powerMonitor);
    this.chrome = new WebContentsView({
      webPreferences: viewPreferences(join(import.meta.dirname, '../preload/chrome.cjs')),
    });
    protectAppContents(this.chrome.webContents, { role: 'chrome' });
    // Electron hex is `AARRGGBB`, not CSS's `RRGGBBAA`; transposed it is a valid opaque colour, not an error.
    this.chrome.setBackgroundColor('#00000000');
    this.window.contentView.addChildView(this.chrome);
    loadChrome(this.chrome.webContents);
    const pushFocus = (isFocused: boolean): void => {
      send(this.chrome.webContents, IPC_EMIT.chromeWindowFocus, { isFocused });
      this.events.focusTold(isFocused);
    };
    this.window.on('focus', () => {
      pushFocus(true);
      this.events.focusChanged(true);
    });
    this.window.on('blur', () => {
      pushFocus(false);
      this.events.focusChanged(false);
    });
    this.chrome.webContents.on('did-finish-load', () => pushFocus(this.window.isFocused()));
    restOnNewDocument(this.chrome.webContents, () => this.expand({ kind: 'band' }));

    this.window.on('resize', () => {
      this.layout();
      this.remember();
    });
    this.window.on('move', () => this.remember());
    this.window.on('maximize', () => this.remember());
    this.window.on('unmaximize', () => this.remember());
    this.window.on('close', (event) => {
      if (!isMac() || this.isQuitting) return;
      event.preventDefault();
      this.window.hide();
    });
    this.window.once('closed', () => this.events.closed());
    // No view exists yet, so there is nobody to tell.
    this.place();
  }

  get chromeContents(): WebContents {
    return this.chrome.webContents;
  }

  isBandContents(webContentsId: number): boolean {
    return this.chrome.webContents.id === webContentsId;
  }

  /** The rectangle below the band that every Tab view, the spare and a freeze cover fill. */
  get body(): Electron.Rectangle {
    return this.bodyBounds;
  }

  get quitting(): boolean {
    return this.isQuitting;
  }

  /** From here a close closes: on macOS the window otherwise hides and keeps its Tabs. */
  beginQuit(): void {
    this.isQuitting = true;
  }

  /** Re-adding an existing child makes it topmost (documented; the index argument is not); a grown popover otherwise renders behind the tab views (ONL-2206). */
  raiseChrome(): void {
    this.window.contentView.addChildView(this.chrome);
  }

  private remember(): void {
    if (this.window.isDestroyed()) return;
    rememberWindow({
      bounds: this.window.getNormalBounds(),
      isMaximized: this.window.isMaximized(),
    });
  }

  private place(): void {
    const { width, height } = this.window.getContentBounds();
    // From the extent, not the band: a resize with a popover open would shrink the chrome out from under it.
    this.chrome.setBounds({ x: 0, y: 0, width, height: chromeHeightFor(this.extent, height) });
    this.bodyBounds = {
      x: 0,
      y: WINDOW_BAR_HEIGHT,
      width,
      height: Math.max(0, height - WINDOW_BAR_HEIGHT),
    };
  }

  layout(): void {
    this.place();
    this.events.laidOut(this.bodyBounds);
  }

  expand(extent: ChromeExtent): ChromeExtentApplied {
    this.extent = extent;
    this.layout();
    return { height: this.chrome.getBounds().height };
  }

  attach(view: WebContentsView, index?: number): void {
    this.window.contentView.addChildView(view, index);
    view.setBounds(this.bodyBounds);
    this.raiseChrome();
  }

  detach(view: WebContentsView): void {
    if (!this.window.isDestroyed()) this.window.contentView.removeChildView(view);
  }

  /** A still picture over the body, under the band, until the returned call. */
  cover(image: NativeImage): () => void {
    const cover = new electron.ImageView();
    cover.setImage(image);
    cover.setBounds(this.bodyBounds);
    this.window.contentView.addChildView(cover);
    this.raiseChrome();
    return () => {
      if (!this.window.isDestroyed()) this.window.contentView.removeChildView(cover);
    };
  }

  pushSlots(push: ChromeSlotsPush): void {
    const slots = slotsForSession(push.slots, hasOnlookSession());
    send(this.chrome.webContents, IPC_EMIT.chromeSlotsChanged, { ...push, slots });
    if (DRAWS_CAPTION_BUTTONS) this.paintCaptionButtons(slots);
  }

  private paintCaptionButtons(slots: ChromeSlots): void {
    const overlay = captionButtonsFor(slots);
    if (overlay.color === this.captionFill) return;
    this.captionFill = overlay.color;
    this.window.setTitleBarOverlay(overlay);
  }

  show(): void {
    if (wasMaximized()) this.window.maximize();
    this.window.show();
  }
}
