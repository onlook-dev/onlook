import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../../settings/store.js';
import { HStack } from '@astryxdesign/core/Layout';

import { CodePanelSurface } from '../../code/CodePanelSurface.js';
import { REGION } from '../../layout.js';
import { LeftPanelContent } from '../../panels/LeftPanelContent.js';
import { LogoMenu } from '../../rail/LogoMenu.js';
import { RailView } from '../../rail/Rail.js';
import { RailHelp } from '../../rail/RailHelp.js';
import type { LeftPanelView } from '../../rail/leftPanel.js';
import { noop, type Category, type Gallery, type Story } from './Showroom.js';

/** The frame the aside gives it: over the canvas ground, clipped as the panel is. */
function frame(width: number): React.CSSProperties {
  return {
    width,
    height: 320,
    flex: '0 0 auto',
    overflow: 'hidden',
    border: 'var(--border-width) solid var(--color-border)',
    borderRadius: 'var(--radius-element)',
    background: 'var(--studio-ground)',
  };
}

/** The rail alone, at one active item. The designs list beside it is the `sidebar` gallery's subject. */
function Still({ view, head }: { view: LeftPanelView; head?: React.ReactNode }): React.JSX.Element {
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  return (
    <HStack style={frame(REGION.rail)}>
      <RailView view={view} onView={noop} codeEnabled={codeEnabled} foot={<RailHelp />} {...(head === undefined ? {} : { head })} />
    </HStack>
  );
}

/** The rail and the code view together, which is what Code switches to. */
function WithCodeView(): React.JSX.Element {
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const [view, setView] = useState<LeftPanelView>('code');
  return (
    <HStack className="left-panel-width" style={frame(REGION.rail + (view === 'code' ? REGION.code : REGION.sidebar))}>
      <RailView view={view} onView={setView} codeEnabled={codeEnabled} foot={<RailHelp />} />
      <LeftPanelContent view={view} width={view === 'code' ? REGION.code : REGION.sidebar}>
        {view === 'code' ? <CodePanelSurface /> : null}
      </LeftPanelContent>
    </HStack>
  );
}

function OpenMenu({ state }: { state: 'open' | 'hover' | 'focus' }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLButtonElement>('[data-testid="rail-mark"]')?.click();
    if (state !== 'focus') return;
    let frame = 0;
    const focusQuit = (): void => {
      const control = document.querySelector<HTMLElement>('[data-testid="rail-logo-menu-item"][data-value="quit"]');
      if (!control) return;
      observer.disconnect();
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        control.focus();
      }); });
    };
    const observer = new MutationObserver(focusQuit);
    observer.observe(document.body, { childList: true, subtree: true });
    focusQuit();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [state]);
  return <div ref={root} style={{ width: 420, height: 500 }} data-source-menu-state={state}>
      <style href="source-menu-hover" precedence="medium">{`
        body:has([data-source-menu-state="hover"]) [data-testid="rail-logo-menu-item"][data-value="quit"] {
          --color-text-primary: var(--color-on-dark);
          color: var(--color-on-dark);
          background-color: var(--color-overlay-hover);
        }
      `}</style>
      <Still view="designs" head={<LogoMenu />} />
  </div>;
}

function story(id: string, title: string, note: string, render: () => React.ReactNode): Story {
  return { id: `rail-gallery-${id}`, title, note, render };
}

const CATEGORIES: Category[] = [
  {
    id: 'views',
    title: 'The icon rail (ONL-2563)',
    stories: [
      story('panel', 'Code view', 'press Files and Code to switch between their widths', () => (
        <WithCodeView />
      )),
      story('designs', 'Files active', 'the item the panel opens on; a rule separates the mark, and help sits in the foot', () => <Still view="designs" />),
      story('code', 'Code active', 'the same rail, the other item pressed', () => <Still view="code" />),
    ],
  },
  {
    id: 'menu',
    title: 'The mark at the rail’s head (ONL-2563)',
    stories: [
      story('logo', 'The mark', 'press it for the application menu’s commands; the lab bridge reports every one', () => (
        <Still view="designs" head={<LogoMenu />} />
      )),
    ],
  },
  ...(['open', 'hover', 'focus'] as const).map((state) => ({ id: `source-${state}`, title: `Source menu — ${state}`, stories: [story(`logo-${state}`, state, 'The same catalog names source and official apps.', () => <OpenMenu state={state} />)] })),
];

export const RAIL_GALLERY: Gallery = {
  id: 'rail',
  title: 'Rail',
  subtitle: "The Canvas screen's icon rail and application menu.",
  categories: CATEGORIES,
};
