import { takeComplaints } from '../testing/dom.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { act, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChatComposerInput, type ChatComposerInputHandle } from '@astryxdesign/core/Chat';
import type { AgentSkill, SkillAttachment } from '@studio/events';
import { installBridge } from '../testing/bridge.js';
import { useSkillComposer, type SkillComposerHandle } from './useSkillComposer.js';

const SKILL: AgentSkill = { name: 'brand-voice', description: 'Tightens copy', agent: 'claude' };
const ATTACHED: SkillAttachment = { ...SKILL, kind: 'skill' };
const DRAFT = 'Use /brand-voice here';

interface Surface {
  skill: SkillComposerHandle;
  input: ChatComposerInputHandle | null;
  /** A restore or recall: the composer's value written from outside, as `ChatRegion` writes it. */
  setText: (text: string) => void;
  rerender: () => void;
}

/** The library's own editable: a restore reaches it as a controlled value it writes before the hook's effect runs. */
function Composer({ out }: { out: { current?: Surface } }): React.JSX.Element {
  const [text, setText] = useState('');
  const [, setTick] = useState(0);
  const input = useRef<ChatComposerInputHandle | null>(null);
  const skill = useSkillComposer({ text, input, agent: 'claude', skills: [SKILL], heard: true, unavailable: false, disabled: false });
  useEffect(() => {
    out.current = { skill, input: input.current, setText, rerender: () => { setTick((count) => count + 1); } };
  });
  return (
    <div ref={skill.composerRootRef}>
      <ChatComposerInput
        value={text}
        handleRef={input}
        onChange={(value) => {
          setText(value);
          skill.onTextChange(value);
        }}
      />
    </div>
  );
}

let root: Root | undefined;
let container: HTMLElement | undefined;

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = undefined;
  container = undefined;
  const complaints = takeComplaints();
  if (complaints.length > 0) throw new Error(`React complained during this test: ${complaints.join(' / ')}`);
});

async function mountComposer(): Promise<Surface> {
  installBridge({});
  takeComplaints();
  const out: { current?: Surface } = {};
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<Composer out={out} />);
  });
  return {
    get skill() { return out.current!.skill; },
    get input() { return out.current!.input; },
    setText: (text) => { out.current!.setText(text); },
    rerender: () => { out.current!.rerender(); },
  };
}

async function step(work: () => void): Promise<void> {
  await act(async () => {
    work();
  });
}

function tokens(): Element[] {
  return Array.from(container!.querySelectorAll('[contenteditable="true"] [data-astryx-token-value="/brand-voice"]'));
}

async function restoreDraftWithSkill(composer: Surface): Promise<void> {
  await step(() => {
    composer.setText(DRAFT);
    composer.skill.setSelected(ATTACHED);
  });
}

describe('the inline skill token over a restored draft (ONL-2744)', () => {
  it('stands exactly once, where the draft names the skill, and a later render leaves it in place', async () => {
    const composer = await mountComposer();
    await restoreDraftWithSkill(composer);
    const placed = tokens();
    expect(placed).toHaveLength(1);
    expect(composer.input?.getValue()).toBe('Use /brand-voice\u00A0here');
    await step(() => { composer.rerender(); });
    // A boolean, not `toBe`: a failing diff of two happy-dom nodes prints the whole window.
    expect(tokens()[0] === placed[0]).toBe(true);
    expect(tokens()).toHaveLength(1);
  });

  it('stays out of the composer a settled send cleared', async () => {
    const composer = await mountComposer();
    await restoreDraftWithSkill(composer);
    await step(() => { composer.skill.onSendSettled(); });
    await step(() => { composer.setText(''); });
    await step(() => { composer.rerender(); });
    expect(tokens()).toHaveLength(0);
  });

  it('comes back once a send fails, since the draft is still the designer\'s', async () => {
    const composer = await mountComposer();
    await restoreDraftWithSkill(composer);
    await step(() => { composer.skill.onSendSettled(); });
    await step(() => { composer.setText(''); });
    await step(() => { composer.skill.onSendFailed(); });
    expect(tokens()).toHaveLength(1);
  });
});
