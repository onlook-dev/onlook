import { expect, test, type Page } from '@playwright/test';
import { closeStudio, isTargetPresent, launchStudio, missingHint, type Target } from './launch.js';

/* The pointer, selection and supporting size over a menu, read from the real cascade because jsdom cannot show it (ONL-3181). */

const MENU = '[data-testid="chat-connectors-menu"]';

function target(): Target {
  const value = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
  expect(isTargetPresent(value), missingHint(value)).toBe(true);
  return value;
}

async function showroom(gallery: string, galleryTestId: string, env: Record<string, string> = {}): Promise<{ page: Page; close: () => Promise<unknown> }> {
  const app = await launchStudio(target(), { STUDIO_SHOWROOM: gallery, ...env });
  try {
    const page = await app.firstWindow();
    await page.getByTestId(galleryTestId).waitFor({ state: 'visible', timeout: 30_000 });
    return { page, close: () => closeStudio(app) };
  } catch (error) {
    await closeStudio(app).catch(() => {});
    throw error;
  }
}

/** Every cursor a surface actually draws, not only the I-beam: a row that took the hand back has to fail too. */
function pointerReport(page: Page, selector: string): Promise<{ root: string; cursors: string[]; selects: string[] }> {
  return page.locator(selector).first().evaluate((root) => {
    const nodes = [root, ...root.querySelectorAll('*')].filter((node): node is HTMLElement => node instanceof HTMLElement);
    const pressable = nodes.filter((node) => node.closest('button, a[href], [role="button"], [role="link"]') === null);
    return {
      root: getComputedStyle(root).cursor,
      cursors: [...new Set(pressable.map((node) => getComputedStyle(node).cursor))],
      selects: [...new Set(pressable.map((node) => getComputedStyle(node).userSelect))],
    };
  });
}

test('the Connectors menu answers the pointer instantly, in white, at a readable size, with no I-beam', async () => {
  const { page, close } = await showroom('connectors/connectors-menu-rows-cloud', 'showroom-connectors');
  try {
    await page.locator(MENU).waitFor();

    const sizes = await page.locator(MENU).evaluate((menu) => [...menu.querySelectorAll('*')]
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node.childElementCount === 0 && (node.textContent ?? '').trim().length > 0)
      .map((node) => ({ text: (node.textContent ?? '').trim(), size: parseFloat(getComputedStyle(node).fontSize) })));
    expect(sizes.length).toBeGreaterThan(5);
    expect(sizes.filter((entry) => entry.size < 12)).toEqual([]);

    const row = page.locator(`${MENU} [data-featured="mobbin"]`);
    await row.hover();
    const hovered = await row.evaluate((element) => {
      const label = element.querySelector<HTMLElement>('[data-testid="chat-connectors-featured"] span, span')!;
      const status = element.querySelector<HTMLElement>('[data-testid="chat-connectors-state"]')!;
      return {
        detail: getComputedStyle(status).color,
        label: getComputedStyle(label).color,
        filled: getComputedStyle(element).backgroundColor,
        durations: [...new Set([element, ...element.querySelectorAll('*')]
          .flatMap((node) => getComputedStyle(node).transitionDuration.split(',').map((value) => value.trim())))],
      };
    });
    expect(hovered.detail).toBe(hovered.label);
    expect(hovered.filled).not.toBe('rgba(0, 0, 0, 0)');
    expect(hovered.durations).toEqual(['0s']);

    const report = await pointerReport(page, MENU);
    expect(report.root).toBe('default');
    expect(report.cursors).toEqual(['default']);
    expect(report.selects).toEqual(['none']);

    const bounds = await page.locator(`${MENU} [data-testid="chat-connectors-state"]`).first().boundingBox();
    if (bounds === null) throw new Error('A connector status is not visible');
    await page.mouse.move(bounds.x + 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width - 2, bounds.y + bounds.height / 2, { steps: 8 });
    await page.mouse.up();
    expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');

    /* The rule is a design-system default, so it has to hold for a field no menu carries yet. */
    expect(await page.locator(MENU).evaluate((menu) => {
      const field = menu.appendChild(document.createElement('input'));
      const style = getComputedStyle(field);
      const seen = { cursor: style.cursor, userSelect: style.userSelect };
      field.remove();
      return seen;
    })).toEqual({ cursor: 'text', userSelect: 'text' });
  } finally {
    await close();
  }
});

test('a picker list takes the same pointer as a menu, and the opt-in class carries a popover that has no role', async () => {
  const { page, close } = await showroom('github-import/branch-menu', 'showroom-github-import');
  try {
    const listbox = await pointerReport(page, '[role="listbox"]');
    expect(listbox.root).toBe('default');
    expect(listbox.cursors).toEqual(['default']);
    expect(listbox.selects).toEqual(['none']);

    await page.getByTestId('showroom-nav-surfaces').click();
    await page.getByRole('button', { name: 'sources', exact: true }).click();
    const panel = page.getByTestId('add-codebase-popover');
    /* The story opens itself on mount; re-selecting it does not always remount. */
    if (!await panel.isVisible()) await page.getByTestId('add-codebase').click();
    await panel.waitFor();
    /* The Add codebase popover carries no menu role, so it opts in; the class is ONL-3182's to add, and adding it here is a no-op once it has. */
    await panel.evaluate((node) => node.classList.add('menu-surface'));
    const popover = await pointerReport(page, '[data-testid="add-codebase-popover"]');
    expect(popover.root).toBe('default');
    expect(popover.cursors).toEqual(['default']);
    expect(popover.selects).toEqual(['none']);
  } finally {
    await close();
  }
});

/* A status sits beside the tool's name in a ~300px row, and `Item` lets only the name shrink, so a long status used to cut it (ONL-3181). */
test('a connector status never pushes a tool name out of its row, and a cut name fades, in English, Japanese and Chinese', async () => {
  for (const locale of ['en', 'ja', 'zh-CN']) {
    const { page, close } = await showroom('connectors/connectors-menu-rows-longest', 'showroom-connectors', locale === 'en' ? {} : { STUDIO_LOCALE: locale });
    try {
      await page.locator(MENU).waitFor();
      const rows = await page.locator(MENU).evaluate((menu) => [...menu.querySelectorAll<HTMLElement>('[data-testid="chat-connectors-name"]')].map((name) => {
        const row = name.closest<HTMLElement>('[data-state]');
        const status = row?.querySelector<HTMLElement>('[data-testid="chat-connectors-state"]');
        const nameBox = name.getBoundingClientRect();
        return {
          state: row?.getAttribute('data-state') ?? 'unknown',
          name: (name.textContent ?? '').trim(),
          status: (status?.textContent ?? '').trim(),
          cut: name.scrollWidth > name.clientWidth,
          faded: getComputedStyle(name).maskImage.includes('gradient'),
          width: Math.round(nameBox.width),
          gap: status ? Math.round(status.getBoundingClientRect().left - nameBox.right) : undefined,
          height: Math.round(row?.getBoundingClientRect().height ?? 0),
        };
      }));
      /* Both featured slots, plus every row `LONGEST_ROWS` holds in dev/showroom/connectors.tsx. */
      expect({ locale, rows: rows.length }).toEqual({ locale, rows: 15 });
      expect(new Set(rows.map((row) => row.status)).size).toBeGreaterThan(5);
      expect({ locale, cutOnce: rows.some((row) => row.cut) }).toEqual({ locale, cutOnce: true });
      expect({ locale, unfaded: rows.filter((row) => row.cut !== row.faded) }).toEqual({ locale, unfaded: [] });
      /* However long the status, the name keeps room to be read and a clear gap before it (ONL-3193). */
      expect({ locale, squeezed: rows.filter((row) => row.width < 72 || (row.gap !== undefined && row.gap < 12)) }).toEqual({ locale, squeezed: [] });
      /* Two rows reading the same words are the same height: the external arrow comes out of the status's share, not the name's. */
      const ragged = [...new Set(rows.map((row) => `${row.name}|${row.status}`))]
        .map((pair) => ({ pair, heights: [...new Set(rows.filter((row) => `${row.name}|${row.status}` === pair).map((row) => row.height))] }))
        .filter((group) => group.heights.length > 1);
      expect({ locale, ragged }).toEqual({ locale, ragged: [] });
      expect({ locale, overflow: await page.locator(MENU).evaluate((menu) => menu.scrollWidth > menu.clientWidth) }).toEqual({ locale, overflow: false });
    } finally {
      await close();
    }
  }
});
