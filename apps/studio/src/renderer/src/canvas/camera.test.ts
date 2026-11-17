import { describe, expect, it } from 'bun:test';
import type { PanelsState } from '@studio/events';
import { REGION } from '../layout.js';
import { cameraFollowingCover, restingFitOptions, type Camera } from './camera.js';

const PANELS: PanelsState = { sidebar: 260, end: 300, code: 640 };

const inset = (side: 'left' | 'right', view: 'designs' | 'code'): number =>
  Number.parseFloat(restingFitOptions({ view, panels: PANELS }).padding[side]);

/** What a frame at rest clears past the panel on that side. */
const clearance = (side: 'left' | 'right', view: 'designs' | 'code'): number =>
  inset(side, view) - (side === 'left' ? PANELS[view === 'code' ? 'code' : 'sidebar'] : PANELS.end);

describe('where a resting fit leaves a frame', () => {
  it('keeps a rail of extra clearance on the left, where the right side has none', () => {
    expect(clearance('left', 'designs') - clearance('right', 'designs')).toBe(REGION.rail);
    expect(clearance('left', 'code') - clearance('right', 'code')).toBe(REGION.rail);
  });

  it('clears the panel beside the rail rather than resting under it', () => {
    expect(clearance('left', 'designs')).toBeGreaterThan(REGION.rail);
    expect(clearance('left', 'code')).toBeGreaterThan(REGION.rail);
  });

  it('allows for the code view at its own width, not the designs view at theirs', () => {
    expect(inset('left', 'code') - inset('left', 'designs')).toBe(PANELS.code - PANELS.sidebar);
  });

  it('leaves the chat panel alone — nothing on the right moved with the view', () => {
    expect(inset('right', 'code')).toBe(inset('right', 'designs'));
    expect(inset('right', 'designs')).toBeGreaterThan(PANELS.end);
  });
});

describe('what the camera does when the left panel covers more or less canvas', () => {
  const CAMERA: Camera = { x: 120, y: 40, zoom: 0.8 };
  /** A frame's left edge in document coordinates, well clear of the panel to start with. */
  const EDGE = 500;
  const COVER = REGION.rail + PANELS.sidebar;

  /** How much canvas shows between the panel's inner edge and that frame's own. */
  const clearance = (camera: Camera, cover: number): number =>
    camera.x + EDGE * camera.zoom - cover;

  const widening = REGION.rail + PANELS.code - COVER;

  it('leaves a frame the same clearance after a switch to the code view', () => {
    expect(clearance(cameraFollowingCover(CAMERA, widening), COVER + widening)).toBeCloseTo(
      clearance(CAMERA, COVER),
    );
  });

  it('leaves it the same clearance through a drag, out and back', () => {
    const wider = cameraFollowingCover(CAMERA, 180);
    expect(clearance(wider, COVER + 180)).toBeCloseTo(clearance(CAMERA, COVER));
    expect(clearance(cameraFollowingCover(wider, -180), COVER)).toBeCloseTo(
      clearance(CAMERA, COVER),
    );
  });

  it('moves the canvas the way the panel edge moves, never against it', () => {
    expect(cameraFollowingCover(CAMERA, 180).x).toBeGreaterThan(CAMERA.x);
    expect(cameraFollowingCover(CAMERA, -180).x).toBeLessThan(CAMERA.x);
  });

  it('leaves the zoom and the vertical alone: this is a pan, not a fit', () => {
    const after = cameraFollowingCover(CAMERA, 180);
    expect(after.zoom).toBe(CAMERA.zoom);
    expect(after.y).toBe(CAMERA.y);
  });
});
