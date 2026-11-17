import { describe, expect, it } from 'bun:test';
import { admitPickerMessage, nextPickerGeneration } from './pickerMessages.js';
import { isPickerLive } from './geometry.js';

const evidence = {
  kind: 'element' as const,
  id: 'el-1',
  tag: 'button',
  domPath: 'html > body > button:nth-of-type(1)',
  outerHtmlSnippet: '<button>Buy</button>',
  textContent: 'Buy',
  classes: [],
  frameUrl: 'http://localhost:3000/',
};

describe('admitPickerMessage', () => {
  const context = {
    ownsWebview: true,
    pickerLive: true,
    activeGeneration: 7,
    selectionGenerations: new Map([['el-1', 5]]),
  };

  it('requires current webview ownership, a live picker, exact generation, and one argument for picks', () => {
    const message = { type: 'picked' as const, evidence, shiftHeld: false, generation: 7 };
    expect(
      admitPickerMessage([message], context),
    ).toEqual(message);
    expect(
      admitPickerMessage([message], { ...context, ownsWebview: false }),
    ).toBeNull();
    expect(
      admitPickerMessage([message], { ...context, pickerLive: false }),
    ).toBeNull();
    expect(
      admitPickerMessage([{ ...message, generation: 6 }], context),
    ).toBeNull();
    expect(admitPickerMessage([message, 'extra'], context)).toBeNull();
  });

  it('admits staleness for a held selection while disarmed using its seed generation', () => {
    const message = { type: 'staleness' as const, id: 'el-1', stale: true, generation: 5 };
    expect(admitPickerMessage([message], { ...context, pickerLive: false })).toEqual(message);
    expect(
      admitPickerMessage([{ ...message, generation: 4 }], { ...context, pickerLive: false }),
    ).toBeNull();
    expect(
      admitPickerMessage([{ ...message, id: 'other' }], { ...context, pickerLive: false }),
    ).toBeNull();
  });

  it('admits refreshed evidence only for the held selection generation', () => {
    const message = { type: 'refreshed' as const, evidence, generation: 5 };
    expect(admitPickerMessage([message], { ...context, pickerLive: false })).toEqual(message);
    expect(
      admitPickerMessage([{ ...message, generation: 4 }], { ...context, pickerLive: false }),
    ).toBeNull();
    expect(
      admitPickerMessage(
        [{ ...message, evidence: { ...evidence, id: 'other' } }],
        { ...context, pickerLive: false },
      ),
    ).toBeNull();
  });

  it('admits a pick with nothing armed in Design, and refuses the same one from Interact (ONL-2455)', () => {
    const message = { type: 'picked' as const, evidence, shiftHeld: false, generation: 7 };
    expect(
      admitPickerMessage([message], {
        ...context,
        pickerLive: isPickerLive({ mode: 'design', tool: 'select' }),
      }),
    ).toEqual(message);
    expect(
      admitPickerMessage([message], {
        ...context,
        pickerLive: isPickerLive({ mode: 'interact', tool: 'select' }),
      }),
    ).toBeNull();
  });

  it('rejects forged evidence before it can mutate or disarm the store', () => {
    expect(
      admitPickerMessage(
        [
          {
            type: 'picked',
            evidence: { ...evidence, tag: 42 },
            shiftHeld: false,
            generation: 7,
          },
        ],
        context,
      ),
    ).toBeNull();
  });
});

describe("the anchor's geometry (ONL-2455)", () => {
  const context = {
    ownsWebview: true,
    pickerLive: false,
    activeGeneration: 9,
    selectionGenerations: new Map([['el-1', 5]]),
  };
  const message = {
    type: 'anchorGeometry' as const,
    id: 'el-1',
    rect: { x: 4, y: 8, width: 120, height: 32 },
    generation: 5,
  };

  it('rides the held entry’s own generation, so a later arm cannot drop it', () => {
    expect(admitPickerMessage([message], context)).toEqual(message);
  });

  it('drops a generation mismatch and an id nothing holds', () => {
    expect(admitPickerMessage([{ ...message, generation: 9 }], context)).toBeNull();
    expect(admitPickerMessage([{ ...message, id: 'other' }], context)).toBeNull();
  });
});

describe('a Space hold relayed from inside a frame (ONL-2577)', () => {
  const context = {
    ownsWebview: true,
    pickerLive: true,
    activeGeneration: 7,
    selectionGenerations: new Map<string, number>(),
  };
  const hold = { type: 'space-pan' as const, held: true, generation: 7 };
  const release = { ...hold, held: false };

  it('releases wherever it lands, so a picker gone quiet mid-hold never strands the hand on', () => {
    expect(admitPickerMessage([release], { ...context, pickerLive: false })).toEqual(release);
    expect(
      admitPickerMessage([release], {
        ...context,
        pickerLive: isPickerLive({ mode: 'design', tool: 'frame' }),
      }),
    ).toEqual(release);
    expect(admitPickerMessage([release], { ...context, activeGeneration: 9 })).toEqual(release);
  });

  it('keeps the hold behind the live picker, which is the suppression a pan has to follow', () => {
    expect(admitPickerMessage([hold], context)).toEqual(hold);
    expect(
      admitPickerMessage([hold], {
        ...context,
        pickerLive: isPickerLive({ mode: 'interact', tool: 'select' }),
      }),
    ).toBeNull();
  });

  it('still needs webview ownership, and a forged payload is refused', () => {
    expect(admitPickerMessage([release], { ...context, ownsWebview: false })).toBeNull();
    expect(admitPickerMessage([{ ...hold, held: 'yes' }], context)).toBeNull();
  });
});

describe('nextPickerGeneration', () => {
  it('gives every arm and disarm a generation no earlier one had', () => {
    const armed = nextPickerGeneration(0);
    const disarmed = nextPickerGeneration(armed);
    const rearmed = nextPickerGeneration(disarmed);
    expect([armed, disarmed, rearmed]).toEqual([1, 2, 3]);
  });
});

describe("our preload's own error", () => {
  const context = { ownsWebview: true, pickerLive: false, activeGeneration: 7, selectionGenerations: new Map<string, number>() };
  const report = { type: 'Error', value: 'guest threw at <path>', frames: [{ platform: 'web:javascript' as const, filename: '<path>', function: 'f', in_app: false }] };

  it('is admitted armed or not, with any generation, and still needs webview ownership', () => {
    const message = { type: 'error' as const, report, generation: 1 };
    expect(admitPickerMessage([message], context)).toEqual(message);
    expect(admitPickerMessage([message], { ...context, ownsWebview: false })).toBeNull();
  });

  it('a report with an extra key, an unbounded value, or a malformed frame is refused', () => {
    expect(admitPickerMessage([{ type: 'error', report: { ...report, extra: 1 }, generation: 1 }], context)).toBeNull();
    expect(admitPickerMessage([{ type: 'error', report: { ...report, value: 'x'.repeat(400) }, generation: 1 }], context)).toBeNull();
    expect(admitPickerMessage([{ type: 'error', report: { ...report, frames: [{ filename: 1 }] }, generation: 1 }], context)).toBeNull();
  });
});

describe('the right-click arm (ONL-2563)', () => {
  const context = {
    ownsWebview: true,
    pickerLive: true,
    activeGeneration: 7,
    selectionGenerations: new Map<string, number>(),
  };
  const press = { type: 'context-menu' as const, clientX: 40, clientY: 90, generation: 7 };

  it('admits a press at the live generation', () => {
    expect(admitPickerMessage([press], context)).toEqual(press);
  });

  /* Unlike the wheel and the zoom chord, it goes through BOTH gates: it acts on
     the selection, so it must not fire while the picker is not live. */
  it('is ignored while the picker is not live', () => {
    expect(admitPickerMessage([press], { ...context, pickerLive: false })).toBeNull();
  });

  it('is rejected at a stale generation, as every other arm is', () => {
    expect(admitPickerMessage([{ ...press, generation: 6 }], context)).toBeNull();
  });

  /* A forged NaN would place the menu nowhere, and the menu would then open
     against a point no element is at. */
  it('refuses a point that is not a finite number', () => {
    expect(admitPickerMessage([{ ...press, clientX: Number.NaN }], context)).toBeNull();
    expect(admitPickerMessage([{ ...press, clientY: '90' }], context)).toBeNull();
  });

  it('refuses a press carrying any extra key', () => {
    expect(admitPickerMessage([{ ...press, evidence }], context)).toBeNull();
  });
});
