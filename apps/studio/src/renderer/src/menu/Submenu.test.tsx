import '../testing/dom.js';
import { expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Submenu } from './Submenu.js';

it.each(['left', 'right'] as const)('protects the diagonal path to a %s flyout', async (side) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(
      <Submenu label="Reasoning" isParentOpen row={<div role="menuitem">Model</div>}>
        <div role="menuitem">High</div>
      </Submenu>,
    ));
    const anchor = container.querySelector<HTMLElement>('[role="presentation"]')!;
    await act(async () => anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    const menu = document.querySelector<HTMLElement>('[data-submenu]')!;
    anchor.getBoundingClientRect = () => new DOMRect(400, 200, 180, 32);
    menu.getBoundingClientRect = () => new DOMRect(side === 'left' ? 230 : 590, 200, 160, 180);
    const clientX = side === 'left' ? 410 : 570;
    await act(async () => anchor.dispatchEvent(new PointerEvent('pointerout', {
      bubbles: true, clientX, clientY: 232, relatedTarget: document.body,
    })));
    const bridge = document.querySelector<HTMLElement>('[data-submenu-bridge]');
    expect(bridge).not.toBeNull();
    expect(bridge?.style.position).toBe('fixed');
    expect(menu.contains(bridge)).toBe(false);
    expect(bridge?.style.clipPath).toContain('polygon(');
    expect(Number.parseFloat(bridge?.style.left ?? '')).toBe(side === 'left' ? 390 : 566);
    expect(Number.parseFloat(bridge?.style.width ?? '')).toBe(24);
    await act(async () => menu.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })));
    expect(document.querySelector('[data-submenu-bridge]')).toBeNull();
    await act(async () => anchor.dispatchEvent(new PointerEvent('pointerout', {
      bubbles: true, clientX, clientY: 232, relatedTarget: document.body,
    })));
    expect(document.querySelector('[data-submenu-bridge]')).not.toBeNull();
    await act(async () => root.render(
      <Submenu label="Reasoning" isParentOpen={false} row={<div role="menuitem">Model</div>}>
        <div role="menuitem">High</div>
      </Submenu>,
    ));
    expect(document.querySelector('[data-submenu-bridge]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
