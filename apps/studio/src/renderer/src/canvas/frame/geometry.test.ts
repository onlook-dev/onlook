import { describe, expect, it } from 'bun:test';
import {
  CHROME_MIN_ZOOM,
  frameLocalFromGuest,
  guestPointFrom,
  isAddressUnderModeSwitch,
  isChromeVisible,
  isGuestShielded,
  isPickerLive,
  isPickSuppressed,
  leadingControlSurplus,
  readGuestZoom,
  zoomAboutCanvasPoint,
} from './geometry.js';
import { ZOOM_BOUNDS } from '../model.js';
import type { CanvasTool } from '../store.js';

type Row = {
  isResizing: boolean;
  tool: CanvasTool;
  isSpacePanning: boolean;
  mode: 'design' | 'interact';
  isFileDragging: boolean;
};

function row(spec: {
  resizing?: boolean;
  pan?: boolean;
  frame?: boolean;
  text?: boolean;
  space?: boolean;
  interact?: boolean;
  files?: boolean;
}): Row {
  return {
    isResizing: spec.resizing === true,
    tool:
      spec.pan === true
        ? 'pan'
        : spec.frame === true
          ? 'frame'
          : spec.text === true
            ? 'text'
            : 'select',
    isSpacePanning: spec.space === true,
    mode: spec.interact === true ? 'interact' : 'design',
    isFileDragging: spec.files === true,
  };
}

describe('the guest shield', () => {
  const LIVE: [Row, boolean, string][] = [
    [row({}), true, 'Design, select tool — the page is never interactive here'],
    [row({ pan: true }), true, 'hand tool, Design'],

    [row({ interact: true }), false, 'Interact — a running app, not an object'],

    [row({ pan: true, interact: true }), true, 'hand tool is reachable in Interact, so it applies'],

    [row({ resizing: true }), true, 'resizing, Design'],
    [row({ resizing: true, interact: true }), true, 'resizing in Interact — handles are drawn there'],

    [row({ resizing: true, pan: true }), true, 'resizing and pan, Design'],
    [row({ resizing: true, pan: true, interact: true }), true, 'resizing and pan, Interact'],

    [row({ frame: true }), true, 'frame tool, Design — a draw crosses shielded guests'],
    [
      row({ frame: true, interact: true }),
      false,
      'frame tool, Interact — unreachable via the store (setTool refuses), pinned as the Design clause alone',
    ],
    [row({ resizing: true, frame: true }), true, 'resizing and frame tool, Design'],
    [row({ resizing: true, frame: true, interact: true }), true, 'resizing wins in Interact too'],
    [row({ space: true, interact: true }), true, 'space held in Interact — the pan needs the cover'],
    [row({ space: true }), true, 'space held in Design — already shielded, and stays so'],

    [row({ text: true }), true, 'text tool, Design — a placing click lands over shielded guests (ONL-2486)'],
    [
      row({ text: true, interact: true }),
      false,
      'text tool, Interact — unreachable via the store (setTool refuses), pinned as the Design clause alone',
    ],

    [
      row({ files: true, interact: true }),
      true,
      'a file drag in Interact — an unshielded drop would navigate the guest (ONL-2486)',
    ],
    [row({ files: true }), true, 'a file drag in Design — already shielded, and stays so'],
  ];

  it('covers a live guest on five axes, and Interact suppresses only the Design clause', () => {
    for (const [input, expected, why] of LIVE) {
      expect(isGuestShielded(input), why).toBe(expected);
    }

    // The rows are a mix: all-true would pass `() => true`.
    const shielded = LIVE.filter(([, expected]) => expected).length;
    expect(shielded).toBe(15);
    expect(LIVE.length - shielded).toBe(3);
  });

  it('is not raised by a drag carrying no file', () => {
    expect(isGuestShielded(row({ interact: true, files: false }))).toBe(false);
  });
});

describe('the live picker (ONL-2455)', () => {
  it('is the mode and the tool, with no arming step', () => {
    expect(isPickerLive({ mode: 'design', tool: 'select' })).toBe(true);
    expect(isPickerLive({ mode: 'interact', tool: 'select' })).toBe(false);
  });

  it('is off under the pan, frame and text tools, which disarmed it before', () => {
    expect(isPickerLive({ mode: 'design', tool: 'pan' })).toBe(false);
    expect(isPickerLive({ mode: 'design', tool: 'frame' })).toBe(false);
    expect(isPickerLive({ mode: 'design', tool: 'text' })).toBe(false);
  });

  it('takes neither the space-pan nor a resize as an input — a momentary pan must not cancel what the user reached for', () => {
    const live = row({ space: true, resizing: true });
    expect(isGuestShielded(live), 'the shield covers this gesture').toBe(true);
    expect(isPickerLive(live)).toBe(true);
  });
});

describe('a gesture that ends over a frame (ONL-2455)', () => {
  type Gesture = {
    isResizing: boolean;
    tool: CanvasTool;
    isSpacePanning: boolean;
    isDrawingFrame: boolean;
    isDuplicateDragging: boolean;
  };
  const idle: Gesture = {
    isResizing: false,
    tool: 'select',
    isSpacePanning: false,
    isDrawingFrame: false,
    isDuplicateDragging: false,
  };

  it('releases into a pick only from an idle canvas', () => {
    expect(isPickSuppressed(idle)).toBe(false);
  });

  it('drops the pick after a pan, a space-pan, a frame draw, a text placement, a duplicate drag, or a resize', () => {
    expect(isPickSuppressed({ ...idle, tool: 'pan' })).toBe(true);
    expect(isPickSuppressed({ ...idle, isSpacePanning: true })).toBe(true);
    expect(isPickSuppressed({ ...idle, tool: 'frame' })).toBe(true);
    expect(isPickSuppressed({ ...idle, tool: 'text' })).toBe(true);
    expect(isPickSuppressed({ ...idle, isDrawingFrame: true })).toBe(true);
    expect(isPickSuppressed({ ...idle, isDuplicateDragging: true })).toBe(true);
    expect(isPickSuppressed({ ...idle, isResizing: true })).toBe(true);
  });

  it('suppresses the pick without suppressing the activation', () => {
    const spacePan = { ...idle, isSpacePanning: true };
    expect(isPickSuppressed(spacePan)).toBe(true);
    expect(isPickerLive({ mode: 'design', tool: spacePan.tool })).toBe(true);
  });
});

describe('the address pill under the mode switch', () => {
  // Read off the built app at a 1440 window (ONL-1904), not chosen.
  const collided = {
    frameTop: 47,
    frameLeft: 432.5,
    frameWidth: 575,
    bandBottom: 56,
    switchStart: 645,
    switchEnd: 795,
  };

  it('answers true for the driven collision, and false where the driven control clicked', () => {
    expect(isAddressUnderModeSwitch(collided)).toBe(true);

    expect(isAddressUnderModeSwitch({ ...collided, frameTop: 147 })).toBe(false);
  });

  it('is not a purely vertical test — a frame beside the switch keeps its pill', () => {
    expect(isAddressUnderModeSwitch({ ...collided, frameLeft: 100 })).toBe(false);
    expect(isAddressUnderModeSwitch({ ...collided, frameLeft: 1200 })).toBe(false);
  });
});

describe('the pointer -> guest conversion (ONL-1989)', () => {
  const rect = { left: 100, top: 50 };

  it('divides by the canvas zoom', () => {
    expect(guestPointFrom({ x: 150, y: 100 }, rect, 0.5, 1)).toEqual({ x: 100, y: 100 });
  });

  it('divides by the GUEST zoom too — the reported miss', () => {
    expect(guestPointFrom({ x: 350, y: 50 }, rect, 1, 1.25)).toEqual({ x: 200, y: 0 });
  });

  it('composes both factors', () => {
    expect(guestPointFrom({ x: 225, y: 175 }, rect, 0.5, 1.25)).toEqual({ x: 200, y: 200 });
  });

  it('treats a zero, negative or NaN scale as 1 rather than dividing by it', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(guestPointFrom({ x: 150, y: 80 }, rect, 1, bad), `guest ${String(bad)}`).toEqual({
        x: 50,
        y: 30,
      });
      expect(guestPointFrom({ x: 150, y: 80 }, rect, bad, 1), `canvas ${String(bad)}`).toEqual({
        x: 50,
        y: 30,
      });
    }
  });

  it('round-trips a guest point back to frame-local units through the inverse', () => {
    const local = frameLocalFromGuest(guestPointFrom({ x: 350, y: 50 }, rect, 1, 1.25), 1.25);
    expect(local).toEqual({ x: 250, y: 0 });
    expect(frameLocalFromGuest({ x: 10, y: 10 }, 0)).toEqual({ x: 10, y: 10 });
  });
});

describe('the guest zoom reader', () => {
  it('answers 1 with no element, and what the element says otherwise', () => {
    expect(readGuestZoom(null)).toBe(1);
    expect(readGuestZoom(undefined)).toBe(1);
    expect(readGuestZoom({ getZoomFactor: () => 1.25 })).toBe(1.25);
  });

  it('answers 1 when the element throws — a webview not yet attached', () => {
    expect(
      readGuestZoom({
        getZoomFactor: () => {
          throw new Error('The WebView must be attached to the DOM');
        },
      }),
    ).toBe(1);
  });
});

describe('isChromeVisible', () => {
  it('hides an unselected frame\'s chrome at the smallest canvas zoom and shows it at 100%', () => {
    expect(isChromeVisible({ zoom: ZOOM_BOUNDS.min, isSelected: false })).toBe(false);
    expect(isChromeVisible({ zoom: 1, isSelected: false })).toBe(true);
  });

  it('a selected frame keeps its chrome at any zoom', () => {
    expect(isChromeVisible({ zoom: 0.05, isSelected: true })).toBe(true);
  });
});

describe("a frame's own right-click surface (ONL-2502)", () => {
  type Resting = { interact?: boolean; selected?: boolean; zoom: number };

  // At rest: a resize, a pan, a space-pan or a file drag only adds a shield, so this is the worst case.
  function hasSurface(frame: Resting): boolean {
    return (
      isGuestShielded(row(frame.interact === true ? { interact: true } : {})) ||
      isChromeVisible({ zoom: frame.zoom, isSelected: frame.selected === true })
    );
  }

  const BELOW = CHROME_MIN_ZOOM / 2;
  const ABOVE = 1;

  const STATES: [Resting, boolean, string][] = [
    [{ zoom: ABOVE }, true, 'Design, unselected, chrome showing — the shield answers'],
    [{ zoom: BELOW }, true, 'Design, unselected, no chrome — the shield still answers'],
    [{ selected: true, zoom: ABOVE }, true, 'Design, selected'],
    [{ selected: true, zoom: BELOW }, true, 'Design, selected, below the chrome floor'],
    [{ interact: true, zoom: ABOVE }, true, 'Interact, unselected — the chrome band answers'],
    [{ interact: true, selected: true, zoom: ABOVE }, true, 'Interact, selected'],
    [
      { interact: true, selected: true, zoom: BELOW },
      true,
      'Interact, selected, below the floor — selection keeps the band',
    ],
    [
      { interact: true, zoom: BELOW },
      false,
      'Interact, unselected, below the floor — the one state with no surface. The deleted button drew here on a Designs-row hover, which clears on leave, so the pointer could never cross the bare pane to reach it',
    ],
  ];

  it('is present in every state a pointer could reach the deleted button in, and absent only where it could not', () => {
    for (const [frame, expected, why] of STATES) {
      expect(hasSurface(frame), why).toBe(expected);
    }

    const reachable = STATES.filter(([, expected]) => expected).length;
    expect(reachable).toBe(7);
    expect(STATES.length - reachable).toBe(1);
  });
});

describe('zoomAboutCanvasPoint', () => {
  it('keeps the canvas point under the pointer where it was on screen, clamped zoom included', () => {
    const viewport = { x: -120, y: 40, zoom: 0.8 };
    const point = { x: 900, y: 300 };
    const onScreen = (v: { x: number; y: number; zoom: number }) => ({
      x: point.x * v.zoom + v.x,
      y: point.y * v.zoom + v.y,
    });

    for (const [deltaY, isPinch] of [
      [-100, false],
      [30, true],
      [-1_000_000, false],
    ] as const) {
      const next = zoomAboutCanvasPoint(viewport, point, deltaY, isPinch, ZOOM_BOUNDS);
      expect(next.zoom, `deltaY ${String(deltaY)}`).not.toBe(viewport.zoom);
      expect(onScreen(next).x).toBeCloseTo(onScreen(viewport).x, 9);
      expect(onScreen(next).y).toBeCloseTo(onScreen(viewport).y, 9);
    }
  });
});

describe('the frame name centred on the frame', () => {
  it('gives back one control for each history control the left group holds beyond the menu', () => {
    expect(leadingControlSurplus({ canGoBack: false, canGoForward: false })).toBe(0);
    expect(leadingControlSurplus({ canGoBack: true, canGoForward: false })).toBe(1);
    expect(leadingControlSurplus({ canGoBack: false, canGoForward: true })).toBe(1);
    expect(leadingControlSurplus({ canGoBack: true, canGoForward: true })).toBe(2);
  });
});
