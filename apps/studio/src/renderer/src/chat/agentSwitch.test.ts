import { describe, expect, test } from 'bun:test';
import type { AgentCommandAcceptance, HarnessId, RetryPrompt } from '@studio/events';
import { deferred } from '../testing/bridge.js';
import { refillDue, switchAgent, type ManualComposerDraft, type PendingRefill } from './agentSwitch.js';

const failed: RetryPrompt = { text: 'Make the hero warmer', attachments: [{ id: 'img-1', mediaType: 'image/png', name: 'hero.png' }], context: 'selection' };

function bridge(accepted: boolean): { asked: HarnessId[]; held: PendingRefill[]; deps: Parameters<typeof switchAgent>[3] } {
  const asked: HarnessId[] = [];
  const held: PendingRefill[] = [];
  return {
    asked,
    held,
    deps: {
      workspacePath: '/project',
      command: async (harness): Promise<AgentCommandAcceptance> => {
        asked.push(harness);
        return { accepted };
      },
      hold: (pending) => held.push(pending),
    },
  };
}

describe('the failed message waits in the new chat, unsent (ONL-2903)', () => {
  test('a refused switch never touches the composer', async () => {
    const fake = bridge(false);
    expect(await switchAgent('codex', failed, 's-old', fake.deps)).toBe(false);
    expect(fake.asked).toEqual(['codex']);
    expect(fake.held).toEqual([]);
  });

  test('an accepted switch refills only once the new chat is announced, without the model-only context', async () => {
    const fake = bridge(true);
    await switchAgent('codex', failed, 's-old', fake.deps);
    const [pending] = fake.held;
    expect(refillDue(pending, 's-old', '/project', 'codex')).toBeUndefined();
    expect(refillDue(pending, undefined, '/project', 'codex')).toBeUndefined();
    expect(refillDue(pending, 's-new', '/other', 'codex')).toBeUndefined();
    expect(refillDue(pending, 's-new', '/project', 'claude')).toBeUndefined();
    expect(refillDue(pending, 's-new', '/project', 'codex')).toEqual({ kind: 'failed', prompt: { text: failed.text, attachments: failed.attachments } });
  });

  test('nothing to refill when the row carried no message', async () => {
    const fake = bridge(true);
    expect(await switchAgent('claude', undefined, 's-old', fake.deps)).toBe(true);
    expect(fake.held[0]?.refill).toEqual({ kind: 'none' });
    expect(refillDue(undefined, 's-new', '/project', 'claude')).toBeUndefined();
  });

  test.each(['command-first', 'announcement-first'] as const)('both contracts must arrive: %s', async (order) => {
    const fake = bridge(true);
    const acceptance = deferred<AgentCommandAcceptance>();
    fake.deps.command = () => acceptance.promise;
    const switching = switchAgent('codex', failed, 's-old', fake.deps);
    expect(fake.held).toEqual([]);
    let announced = order === 'announcement-first' ? 's-new' : 's-old';
    expect(refillDue(fake.held[0], announced, '/project', 'codex')).toBeUndefined();
    acceptance.settle({ accepted: true });
    await switching;
    if (order === 'command-first') {
      expect(refillDue(fake.held[0], announced, '/project', 'codex')).toBeUndefined();
      announced = 's-new';
    }
    expect(refillDue(fake.held[0], announced, '/project', 'codex')?.kind).toBe('failed');
  });

  test('manual switching carries the admitted payload, not the failed row or text alone', async () => {
    const fake = bridge(true);
    const draft: ManualComposerDraft = {
      prompt: { text: 'Edited draft', attachments: [{ kind: 'file', id: 'pdf-1', mediaType: 'application/pdf', name: 'brief.pdf', originalSize: 128 }, { kind: 'skill', name: 'design', description: 'Design', agent: 'claude', path: '/skills/design/SKILL.md' }] },
      elements: [],
      selectedNodeIds: ['frame-1'],
      artifacts: [{ kind: 'artifact', artifactId: 'sketch-1', title: 'Sketch' }],
    };
    fake.deps.captureManual = () => draft;
    await switchAgent('codex', failed, 's-old', fake.deps);
    expect(refillDue(fake.held[0], 's-new', '/project', 'codex')).toEqual({ kind: 'manual', draft });
    expect(fake.held[0]?.refill.kind === 'manual' && fake.held[0].refill.draft).toBe(draft);
  });

  test('a rejected command leaves no restore scheduled', async () => {
    const fake = bridge(true);
    fake.deps.command = () => Promise.reject(new Error('unavailable'));
    await expect(switchAgent('codex', failed, 's-old', fake.deps)).rejects.toThrow('unavailable');
    expect(fake.held).toEqual([]);
  });
});
