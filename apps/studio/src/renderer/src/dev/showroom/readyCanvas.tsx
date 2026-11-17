import { Center } from '@astryxdesign/core/Center';
import { ReadyCanvas, type ReadyPhase } from '../../canvas/ideas/ReadyCanvas.js';
import { Focused, noop, type Category } from './Showroom.js';

const GROUND = { position: 'relative', width: 816, height: 560, background: 'var(--studio-ground)', overflow: 'hidden' } as const;
const NARROW = 520;

function Scene({ quiet = false, phase, width = GROUND.width }: { quiet?: boolean; phase?: ReadyPhase; width?: number }): React.JSX.Element {
  return (
    <Center style={{ ...GROUND, width }}>
      <ReadyCanvas quiet={quiet} {...(phase ? { initialPhase: phase } : {})} onPick={noop} />
    </Center>
  );
}

export const READY_CANVAS: Category = {
  id: 'ready-canvas',
  title: 'The ready canvas on a blank project (ONL-2960)',
  stories: [
    { id: 'canvas-ready-rest', title: 'At rest', note: 'a blank project with no frames, before the person has spoken', wide: true, render: () => <Scene /> },
    {
      id: 'canvas-ready-hover',
      title: 'Button hovered',
      wide: true,
      render: () => (
        <Focused selector='[data-testid="ready-canvas"] button' hover>
          <Scene />
        </Focused>
      ),
    },
    { id: 'canvas-ready-ideas', title: 'Ideas revealed', note: 'after "Give me some ideas": the three idea cards', wide: true, render: () => <Scene phase={{ kind: 'revealed' }} /> },
    {
      id: 'canvas-ready-ideas-hover',
      title: 'An idea card hovered',
      wide: true,
      render: () => (
        <Focused selector='[data-idea-part="card:landing"]' hover>
          <Scene phase={{ kind: 'revealed' }} />
        </Focused>
      ),
    },
    { id: 'canvas-ready-narrow', title: 'At rest, narrow canvas', note: 'held a margin from the Left Rail; the right side runs under the Right Rail', wide: true, render: () => <Scene width={NARROW} /> },
    { id: 'canvas-ready-ideas-narrow', title: 'Ideas revealed, narrow canvas', note: 'the first two cards stay in view; the third runs under the Right Rail', wide: true, render: () => <Scene phase={{ kind: 'revealed' }} width={NARROW} /> },
    { id: 'canvas-ready-quiet', title: 'Quiet', note: 'the person has spoken and no frame has landed: every piece fades away', wide: true, render: () => <Scene quiet /> },
  ],
};
