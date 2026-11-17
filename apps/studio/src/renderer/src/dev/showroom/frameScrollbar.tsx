import { useState } from 'react';
import { FrameScrollbar } from '../../canvas/frame/FrameScrollbar.js';
import { FrameRing } from '../../canvas/frame/FrameRing.js';
import { Focused, type Category } from './Showroom.js';

function ScrollbarState({ state, zoom = 1 }: { state: string; zoom?: number }): React.JSX.Element {
  const [top, setTop] = useState(state === 'bottom' ? 1600 : state === 'top' ? 0 : 600);
  const scale = 1 / zoom;
  return (
    <Focused selector={state === 'focus' ? '[role="scrollbar"]' : undefined}>
      <style>{`[data-scrollbar-state='hover'] .frame-scrollbar-thumb-hit { --thumb-width: 8px; } [data-scrollbar-state='drag'] .frame-scrollbar-thumb-hit { --thumb-width: 8px; }`}</style>
      <div data-accent="canvas" data-scrollbar-state={state} style={{ padding: 48, width: 480, height: 440, background: 'var(--studio-ground)' }}>
        <div style={{ position: 'relative', width: 300 / zoom, height: 300 / zoom, transform: `scale(${String(zoom)})`, transformOrigin: 'top left', background: 'var(--color-background-card)' }}>
          <FrameRing zoom={zoom} isEmphasised />
          <div style={{ padding: 24 / zoom, fontSize: 18 / zoom, color: 'var(--color-text)' }}>Pricing</div>
          <FrameScrollbar metrics={{ session: 1, surface: 1, top, viewport: 400, height: 2000 }} scrollTo={setTop} scale={scale} height={300 / zoom} controls="showroom-page" />
          {[0, 300 / zoom].map((corner) => <div key={corner} style={{ position: 'absolute', top: corner, left: '100%', width: 9 / zoom, height: 9 / zoom, transform: 'translate(-50%, -50%)', border: `${String(1.25 / zoom)}px solid var(--studio-teal-hue)`, background: 'white', zIndex: 1 }} />)}
        </div>
      </div>
    </Focused>
  );
}

export const FRAME_SCROLLBAR: Category = {
  id: 'frame-scrollbar', title: 'Selected Frame scrollbar',
  stories: ['default', 'hover', 'focus', 'drag', 'top', 'bottom'].map((state) => ({
    id: `frame-scrollbar-${state}`, title: state, render: () => <ScrollbarState state={state} />,
  })).concat([0.4, 2].map((zoom) => ({
    id: `frame-scrollbar-zoom-${String(zoom).replace('.', '-')}`, title: `Zoom ${String(zoom)}`, render: () => <ScrollbarState state="default" zoom={zoom} />,
  }))),
};
