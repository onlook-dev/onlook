import { useLayoutEffect, useRef } from 'react';
import { ProjectsSidebar } from '../../projects/ProjectsSidebar.js';
import { noop, type Gallery } from './Showroom.js';

const STATES = ['default', 'long-list', 'scrolled', 'empty', 'resolved', 'star-hover', 'dismiss-hover', 'star-focus', 'dismiss-focus'] as const;
type State = (typeof STATES)[number];

const WORKSPACES = Array.from({ length: 40 }, (_, index) => ({
  id: `folder-${String(index)}`,
  name: `folder-${String(index)}`,
}));

const BUTTON_STATES = `
[data-discover-still="star-hover"] [data-testid="projects-discover-star"],
[data-discover-still="dismiss-hover"] [data-testid="projects-discover-dismiss"] {
  background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
}
[data-discover-still="star-focus"] [data-testid="projects-discover-star"],
[data-discover-still="dismiss-focus"] [data-testid="projects-discover-dismiss"] {
  outline: 2px solid var(--color-accent);
  outline-offset: var(--button-focus-offset);
}`;

function Still({ state }: { state: State }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const rail = root.current;
    if (!rail) return;
    if (state === 'scrolled') {
      const scroller = Array.from(rail.querySelectorAll<HTMLElement>('*')).find((element) =>
        getComputedStyle(element).overflowY === 'auto' && element.scrollHeight > element.clientHeight,
      );
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    }
    const action = state.startsWith('star-') ? 'star' : 'dismiss';
    const button = rail.querySelector<HTMLElement>(`[data-testid="projects-discover-${action}"]`);
    if (!button) return;
    if (state.endsWith('-focus') && window.location.hash.includes(`discover-${state}`)) button.focus({ preventScroll: true });
  }, [state]);
  return (
    <div ref={root} data-discover-still={state} style={{ width: 300, height: 520, background: 'var(--studio-ground)' }}>
      <style href="discover-button-states" precedence="medium">{BUTTON_STATES}</style>
      <ProjectsSidebar
        workspaces={state === 'empty' ? [] : state === 'long-list' || state === 'scrolled' ? WORKSPACES : WORKSPACES.slice(0, 3)}
        isRecentSelected
        version="0.4.0-beta.812"
        isDiscoverVisible={state !== 'empty' && state !== 'resolved'}
        onDiscoverStar={noop}
        onDiscoverDismiss={noop}
      />
    </div>
  );
}

export const DISCOVER_GALLERY: Gallery = {
  id: 'discover',
  title: 'Projects discover card',
  subtitle: 'The actual rail, staging hover and focus from the shared Button rules.',
  frame: (children) => <div style={{ paddingBottom: 520 }}>{children}</div>,
  categories: [{
    id: 'states',
    title: 'Rail footer states',
    stories: STATES.map((state) => ({
      id: `discover-${state}`,
      title: state,
      render: () => <Still state={state} />,
    })),
  }],
};
