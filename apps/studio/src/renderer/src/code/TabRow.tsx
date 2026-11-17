import { useLayoutEffect, useRef } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Layout';

import {
  CLOSE_SIZE,
  DIVIDER,
  LABEL_FADE,
  TAB_HEIGHT,
  TAB_PADDING_INLINE,
  TAB_WIDTH,
} from '../chrome/tabs/geometry.js';
import { t } from '@studio/i18n';
import { CloseSmallIcon } from '../icons/glyphs.js';
import { HAIRLINE } from '../panels/rowGeometry.js';

export interface CodeTabFacts {
  /** The tab's key, which is the file's worktree-relative path. */
  path: string;
  name: string;
  isDirty: boolean;
  /** The banner describes the active tab only, so a clash anywhere else needs its own mark (ONL-2563). */
  hasClash?: boolean;
}

export interface TabRowProps {
  tabs: readonly CodeTabFacts[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

/** The window tab's own nudge of the ✕ into its padding. */
const CLOSE_NUDGE = 5;
/** The label's measured ratio, which decides whether its tail is faded. */
const TAB_CHAR_PX = 6.5;

const TAB_INK = `
.code-tab {
  color: var(--color-text-secondary);
}
.code-tab:not(.is-selected):hover {
  background: var(--color-overlay-hover);
  color: color-mix(in srgb, var(--color-text-primary) 35%, var(--color-text-secondary));
}
.code-tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: var(--radius-element);
  background: transparent;
  color: inherit;
  cursor: pointer;
  visibility: hidden;
}
.code-tab.is-selected .code-tab-close,
.code-tab:hover .code-tab-close,
.code-tab-close:focus-visible {
  visibility: visible;
}
.code-tab-close:hover {
  background: color-mix(in srgb, var(--color-text-primary) 12%, transparent);
  color: var(--color-text-primary);
}
.code-tab-dirty {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-text-primary);
  pointer-events: none;
}
.code-tab-dirty[data-clash='true'] {
  background: var(--color-text-yellow);
}
.code-tab.has-mark .code-tab-close {
  visibility: hidden;
}
.code-tab.has-mark:hover .code-tab-dirty {
  display: none;
}
.code-tab.has-mark:hover .code-tab-close {
  visibility: visible;
}
.code-tabs::-webkit-scrollbar {
  display: none;
}
`;

function labelStyle(name: string): React.CSSProperties {
  const fits = name.length * TAB_CHAR_PX + TAB_PADDING_INLINE * 2 + CLOSE_SIZE <= TAB_WIDTH;
  return {
    all: 'unset',
    display: 'block',
    minWidth: 0,
    height: '100%',
    cursor: 'pointer',
    paddingInlineStart: TAB_PADDING_INLINE,
    paddingInlineEnd: TAB_PADDING_INLINE + CLOSE_SIZE - CLOSE_NUDGE,
    fontSize: 'var(--text-supporting-size)',
    lineHeight: `${String(TAB_HEIGHT)}px`,
    fontWeight: 'var(--font-weight-medium)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    ...(fits
      ? {}
      : {
          maskImage: `linear-gradient(to right, black calc(100% - ${String(TAB_PADDING_INLINE + CLOSE_SIZE + LABEL_FADE)}px), transparent calc(100% - ${String(TAB_PADDING_INLINE + CLOSE_SIZE - CLOSE_NUDGE)}px))`,
        }),
  };
}

/** The open files, in the order they opened, scrolling sideways past the panel's width (ONL-2563). */
export function TabRow({ tabs, activePath, onActivate, onClose }: TabRowProps): React.JSX.Element {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const tabPaths = tabs.map((tab) => tab.path).join('\0');
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const reveal = (): void => {
      const active = row.querySelector('[aria-selected="true"]')?.parentElement;
      if (!active) return;
      const container = row.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      if (tab.left < container.left) row.scrollLeft += tab.left - container.left;
      else if (tab.right > container.right) row.scrollLeft += tab.right - container.right;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(row);
    return () => observer.disconnect();
  }, [activePath, tabPaths]);
  return (
    <HStack
      ref={rowRef}
      role="tablist"
      className="code-tabs"
      aria-label={t('code.panel.tabs')}
      data-testid="code-tabs"
      style={{ flexShrink: 0, borderBottom: HAIRLINE, overflowX: 'auto', scrollbarWidth: 'none' }}
    >
      <style href="studio-code-tabs" precedence="medium">
        {TAB_INK}
      </style>
      {tabs.map((tab) => {
        const selected = tab.path === activePath;
        const hasClash = tab.hasClash === true;
        // A clash keeps its mark on a tab the designer has since saved or reloaded nothing into.
        const hasMark = tab.isDirty || hasClash;
        return (
          <div
            key={tab.path}
            className={['code-tab', selected ? 'is-selected' : '', hasMark ? 'has-mark' : ''].join(' ')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              maxWidth: TAB_WIDTH,
              height: TAB_HEIGHT,
              borderInlineEnd: DIVIDER,
              ...(selected
                ? { background: 'var(--color-background-gray)', color: 'var(--color-text-primary)' }
                : {}),
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid="code-tab"
              data-path={tab.path}
              onClick={() => onActivate(tab.path)}
              style={labelStyle(tab.name)}
            >
              {tab.name}
            </button>
            <span
              style={{
                position: 'absolute',
                insetInlineEnd: TAB_PADDING_INLINE - CLOSE_NUDGE,
                top: '50%',
                transform: 'translateY(-50%)',
                width: CLOSE_SIZE,
                height: CLOSE_SIZE,
              }}
            >
              {hasMark && (
                <span
                  className="code-tab-dirty"
                  role="img"
                  aria-label={t(hasClash ? 'code.panel.clashDot' : 'code.panel.unsavedDot', {
                    name: tab.name,
                  })}
                  data-testid="code-tab-dirty"
                  data-clash={hasClash ? 'true' : undefined}
                />
              )}
              <button
                type="button"
                className="code-tab-close"
                aria-label={t('code.panel.closeTab', { name: tab.name })}
                data-testid="code-tab-close"
                onClick={() => onClose(tab.path)}
              >
                <Icon icon={CloseSmallIcon} size="lg" color="inherit" />
              </button>
            </span>
          </div>
        );
      })}
    </HStack>
  );
}
