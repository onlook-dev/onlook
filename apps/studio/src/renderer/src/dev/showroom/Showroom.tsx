import { useLayoutEffect, useRef, useState } from 'react';
import { useUnlockPageScroll } from '../useUnlockPageScroll.js';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { useSettingsStore } from '../../settings/store.js';

export interface Story {
  /** Also the frame's `data-testid`. */
  id: string;
  title: string;
  note?: string;
  /** Title above, not beside: a frame wider than the capture window minus the title column cannot be captured whole (ONL-2499). */
  wide?: boolean;
  render: (context?: { isIsolated: boolean }) => React.ReactNode;
}

export interface Category {
  id: string;
  title: string;
  stories: Story[];
}

export interface Gallery {
  id: string;
  title: string;
  subtitle?: string;
  categories: Category[];
  frame?: (children: React.ReactNode) => React.ReactNode;
}

export interface ShowroomProps {
  galleries: readonly Gallery[];
  /** `<gallery>`, `<gallery>/<category>`, or `<gallery>/<story>` from the hash. */
  initial?: string;
}

const SIDEBAR_WIDTH = 240;

export const noop = (): void => undefined;

export function isTargeted(id: string): boolean {
  return window.location.hash.split(/[/:]/).pop() === id;
}

/** A still cannot point or press: this puts one control under the pointer, or in keyboard focus, as the gallery renders. */
export function Focused({ selector, hover = false, children }: { selector?: string; hover?: boolean; children: React.ReactNode }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!selector || !root.current) return;
    const activate = (): boolean => {
      const control = root.current?.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector);
      if (!control) return false;
      if (hover) {
        control.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        control.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      } else {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        control.focus();
      }
      return true;
    };
    if (activate()) return;
    const observer = new MutationObserver(() => { if (activate()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selector, hover]);
  return <div ref={root}>{children}</div>;
}

function scrollTo(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

function StoryFrame({ story, isIsolated }: { story: Story; isIsolated: boolean }): React.JSX.Element {
  const isWide = story.wide === true;
  const title = (
    <VStack
      gap={0}
      data-testid={`${story.id}-title`}
      style={
        isWide
          ? { paddingBlockEnd: 'var(--spacing-2)' }
          : {
              width: 240,
              flex: '0 0 auto',
              /* The document scrolls; any overflow other than visible above this un-sticks it. */
              position: 'sticky',
              top: 'var(--spacing-6)',
              /* flex-start, or the column stretches to the story's height and pins nothing. */
              alignSelf: 'flex-start',
              paddingBlockEnd: 'var(--spacing-2)',
            }
      }
    >
      <Text size="sm" color="secondary">
        {story.title}
      </Text>
      {story.note && (
        <Text size="xsm" color="secondary">
          {story.note}
        </Text>
      )}
    </VStack>
  );
  const frame = (
    <HStack gap={3} vAlign="center" style={{ flexWrap: 'wrap' }}>
      {story.render({ isIsolated })}
    </HStack>
  );
  const props = { id: story.id, 'data-testid': story.id, style: { scrollMarginTop: 'var(--spacing-6)' } };
  /* start, not center: a centred item has no room for sticky to travel. */
  return isWide ? (
    <VStack {...props} gap={2}>
      {title}
      {frame}
    </VStack>
  ) : (
    <HStack {...props} gap={4} vAlign="start">
      {title}
      {frame}
    </HStack>
  );
}

/** A story id too, so a still can reach a state that sits below its category's fold. */
function scrollToCategoryOrStory(id: string): void {
  if (document.getElementById(`category-${id}`)) return scrollTo(`category-${id}`);
  scrollTo(id);
}

export function Showroom({ galleries: allGalleries, initial }: ShowroomProps): React.JSX.Element {
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const galleries = allGalleries.flatMap((gallery) => {
    if (!codeEnabled && gallery.id === 'code') return [];
    if (codeEnabled || gallery.id !== 'rail') return [gallery];
    return [{
      ...gallery,
      categories: gallery.categories.map((category) => ({
        ...category,
        stories: category.stories.filter((story) => story.id !== 'rail-gallery-panel' && story.id !== 'rail-gallery-code'),
      })),
    }];
  });
  // `/` is the env contract; `:` is forgiven, since the CLI spells it that way.
  const [initialGallery, initialCategory, initialStory] = (initial ?? '').split(/[/:]/);
  const first = galleries.find((g) => g.id === initialGallery) ?? galleries[0];
  const initialTarget = first?.categories.find((category) =>
    category.id === initialCategory || category.stories.some((story) => story.id === initialCategory),
  );
  const [selectedId, setSelectedId] = useState(first?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialTarget?.id,
  );
  const [selectedStory, setSelectedStory] = useState<string | undefined>(
    () => initialTarget?.stories.find((story) => story.id === (initialStory ?? initialCategory))?.id,
  );
  const gallery = galleries.find((g) => g.id === selectedId) ?? first;

  useUnlockPageScroll();
  useLayoutEffect(() => {
    const target = selectedStory ?? selectedCategory;
    if (target) scrollToCategoryOrStory(target);
  }, [selectedCategory, selectedStory]);

  const body = gallery ? (
    <VStack gap={8} data-testid={`showroom-${gallery.id}`}>
      <VStack gap={0.5}>
        <Text size="xl" weight="bold">
          {gallery.title}
        </Text>
        {gallery.subtitle && (
          <Text size="sm" color="secondary">
            {gallery.subtitle}
          </Text>
        )}
      </VStack>
      {gallery.categories.flatMap((category) => (!selectedCategory || category.id === selectedCategory) ? [(
        <VStack key={category.id} id={`category-${category.id}`} gap={4} style={{ scrollMarginTop: 'var(--spacing-6)' }}>
          <Text size="lg" weight="medium">
            {category.title}
          </Text>
          <Divider />
          {/* start, not center: a centred item has no room for sticky to travel. */}
          {category.stories.flatMap((story) => (!selectedStory || story.id === selectedStory) ? [(
            <StoryFrame key={story.id} story={story} isIsolated={selectedStory !== undefined} />
          )] : [])}
        </VStack>
      )] : [])}
    </VStack>
  ) : null;

  return (
    <div style={{ minHeight: '100%', background: 'var(--color-background-body)', fontFamily: 'var(--font-family-body)' }} data-testid="showroom">
      {/* Fixed, not sticky: the document is the scroller. */}
      <VStack
        as="nav"
        gap={4}
        aria-label="Showroom"
        style={{
          position: 'fixed',
          insetBlock: 0,
          insetInlineStart: 0,
          width: SIDEBAR_WIDTH,
          overflowY: 'auto',
          padding: 'var(--spacing-6) var(--spacing-4)',
          borderInlineEnd: '0.5px solid var(--color-border)',
          background: 'var(--color-background-body)',
        }}
      >
        <Text size="sm" weight="bold">
          Showroom
        </Text>
        {galleries.map((g) => {
          const isSelected = g.id === gallery?.id;
          return (
            <VStack key={g.id} gap={0.5}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(g.id);
                  setSelectedCategory(undefined);
                  setSelectedStory(undefined);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={isSelected ? 'true' : undefined}
                data-testid={`showroom-nav-${g.id}`}
                style={{ ...NAV_BUTTON, background: isSelected ? 'var(--color-background-gray)' : 'transparent' }}
              >
                <Text size="sm" weight="medium" color="primary">
                  {g.title}
                </Text>
              </button>
              {isSelected &&
                g.categories.map((category) => (
                  <VStack key={category.id} gap={0} style={{ paddingInlineStart: 'var(--spacing-2)' }}>
                    <button type="button" onClick={() => { setSelectedCategory(category.id); setSelectedStory(undefined); }} style={NAV_BUTTON} data-testid={`showroom-nav-${category.id}`}>
                      <Text size="xsm" weight="medium" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {category.title}
                      </Text>
                    </button>
                    {category.stories.map((story) => (
                      <button key={story.id} type="button" onClick={() => { setSelectedCategory(category.id); setSelectedStory(story.id); }} style={{ ...NAV_BUTTON, paddingInlineStart: 'var(--spacing-4)' }}>
                        <Text size="sm" color="secondary" maxLines={1} hasTruncateTooltip={false}>
                          {story.title}
                        </Text>
                      </button>
                    ))}
                  </VStack>
                ))}
            </VStack>
          );
        })}
      </VStack>

      <div style={{ marginInlineStart: SIDEBAR_WIDTH, padding: 'var(--spacing-8)', minWidth: 0 }}>
        {gallery?.frame ? gallery.frame(body) : body}
      </div>
    </div>
  );
}

const NAV_BUTTON: React.CSSProperties = {
  appearance: 'none',
  border: 0,
  margin: 0,
  padding: 'var(--spacing-1) var(--spacing-2)',
  font: 'inherit',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'start',
  borderRadius: 'var(--radius-element)',
  width: '100%',
};
