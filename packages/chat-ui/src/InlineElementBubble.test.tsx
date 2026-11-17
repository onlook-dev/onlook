import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  InlineElementBubble,
  inlineBubbleSendVerdict,
  resolveInlineBubbleKey,
  type InlineBubbleKeyState,
  type InlineElementBubbleProps,
} from './InlineElementBubble.js';
import type { InlineElementBubbleStrings } from './strings.js';

const STRINGS: InlineElementBubbleStrings = {
  placeholder: 'Ask about this element',
};

const CHIP_ROW = <div data-testid="bubble-chip-row">span.hero</div>;

function render(overrides: Partial<InlineElementBubbleProps> = {}): string {
  return renderToStaticMarkup(
    <InlineElementBubble
      strings={STRINGS}
      draft=""
      onDraftChange={() => {}}
      onSubmit={() => {}}
      onDismiss={() => {}}
      surface="layer"
      {...overrides}
    />,
  );
}

/** The send button's own tag — a `disabled` anywhere else in the tree must not pass. */
function sendTag(html: string): string {
  const at = html.indexOf('data-testid="inline-element-bubble-send"');
  expect(at).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1);
}

/** The bubble's own root tag: the input's trigger menu is always a popover in the tree. */
function rootTag(html: string): string {
  return html.slice(0, html.indexOf('>') + 1);
}

/** Scoped by its sentence: the send button's own `role="status"` region passes an unscoped assertion with no band at all. */
function bandTag(html: string, message: string): string {
  const at = html.indexOf(message);
  expect(at).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<div', at);
  return html.slice(open, html.indexOf('>', open) + 1);
}

function key(overrides: Partial<InlineBubbleKeyState> = {}): InlineBubbleKeyState {
  return {
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    keyCode: 13,
    draft: 'why is this red',
    isSessionUsable: true,
    hasPayload: false,
    ...overrides,
  };
}

describe('InlineElementBubble chip row (ONL-2455)', () => {
  test('an empty draft with no chips renders one input and no chip row', () => {
    const html = render();
    // React ships the editable host as `contentEditable`, camelCase, in static markup.
    expect(html).toContain('contentEditable="true"');
    expect(html).not.toContain('bubble-chip-row');
    // The 80px floor is the main panel's choice; the bubble rests at one row.
    expect(html).not.toContain('min-height:80px');
  });

  test('a supplied chip row renders above the input, and removing the chips removes the row', () => {
    const withChips = render({ drawer: CHIP_ROW });
    expect(withChips).toContain('bubble-chip-row');
    expect(withChips.indexOf('bubble-chip-row')).toBeLessThan(
      withChips.indexOf('contentEditable="true"'),
    );
    expect(render({ drawer: undefined })).not.toContain('bubble-chip-row');
  });
});

describe('InlineElementBubble send gating (ONL-2455)', () => {
  test('send is disabled on an empty draft, with or without chips', () => {
    expect(sendTag(render())).toContain('disabled');
    expect(sendTag(render({ drawer: CHIP_ROW }))).toContain('disabled');
  });

  test('send is enabled once there is text', () => {
    expect(sendTag(render({ draft: 'why is this red' }))).not.toContain('disabled');
  });

  test('send is enabled on an empty draft once a payload is held (ONL-2549)', () => {
    expect(sendTag(render({ draft: '', hasComposerPayload: true }))).not.toContain('disabled');
  });

  // A payload must not reach around the connection term: `isConnected && (text || payload)`, never `(isConnected && text) || payload`.
  test('a payload does not rescue an unusable session', () => {
    expect(
      sendTag(render({ draft: '', hasComposerPayload: true, isSessionUsable: false })),
    ).toContain('disabled');
  });

  test('an unusable session renders the bubble disabled', () => {
    const html = render({ draft: 'why is this red', isSessionUsable: false });
    expect(sendTag(html)).toContain('disabled');
    expect(html).toContain('contentEditable="false"');
  });
});

describe('InlineElementBubble keys (ONL-2455)', () => {
  test('Escape dismisses from any state', () => {
    expect(resolveInlineBubbleKey(key({ key: 'Escape' }))).toBe('dismiss');
    expect(resolveInlineBubbleKey(key({ key: 'Escape', draft: '' }))).toBe('dismiss');
    expect(resolveInlineBubbleKey(key({ key: 'Escape', isSessionUsable: false }))).toBe('dismiss');
  });

  test('Enter on a non-empty draft sends', () => {
    expect(resolveInlineBubbleKey(key())).toBe('send');
  });

  test('Shift+Enter is the newline and never sends', () => {
    expect(resolveInlineBubbleKey(key({ shiftKey: true }))).toBe('ignore');
  });

  test('Enter on an empty draft sends nothing — the element is the subject, not the request', () => {
    expect(resolveInlineBubbleKey(key({ draft: '' }))).toBe('ignore');
    expect(resolveInlineBubbleKey(key({ draft: '   ' }))).toBe('ignore');
  });

  test('Enter on an empty draft sends once a payload is held (ONL-2549)', () => {
    expect(resolveInlineBubbleKey(key({ draft: '', hasPayload: true }))).toBe('send');
    expect(resolveInlineBubbleKey(key({ draft: '   ', hasPayload: true }))).toBe('send');
  });

  test('Enter on an unusable session sends nothing', () => {
    expect(resolveInlineBubbleKey(key({ isSessionUsable: false }))).toBe('ignore');
    expect(
      resolveInlineBubbleKey(key({ draft: '', hasPayload: true, isSessionUsable: false })),
    ).toBe('ignore');
  });

  test('an IME composition never sends', () => {
    expect(resolveInlineBubbleKey(key({ isComposing: true }))).toBe('ignore');
    expect(resolveInlineBubbleKey(key({ keyCode: 229 }))).toBe('ignore');
  });

  test('a typed prompt is never refused: the two verdicts left are send and ignore (ONL-2294)', () => {
    const verdicts = new Set<string>();
    for (const draft of ['', '  ', 'why is this red']) {
      for (const isSessionUsable of [true, false]) {
        for (const hasPayload of [true, false]) {
          verdicts.add(inlineBubbleSendVerdict({ draft, isSessionUsable, hasPayload }));
          verdicts.add(resolveInlineBubbleKey(key({ draft, isSessionUsable, hasPayload })));
        }
      }
    }
    expect([...verdicts].sort()).toEqual(['ignore', 'send']);
  });

  test('both send paths read one verdict, so the button and Enter cannot diverge', () => {
    for (const state of [
      { draft: 'why is this red', isSessionUsable: true, hasPayload: false },
      { draft: '', isSessionUsable: true, hasPayload: false },
      { draft: '', isSessionUsable: true, hasPayload: true },
      { draft: 'why is this red', isSessionUsable: false, hasPayload: true },
    ] as const) {
      expect(
        resolveInlineBubbleKey({
          ...state,
          key: 'Enter',
          shiftKey: false,
          isComposing: false,
          keyCode: 13,
        }),
      ).toBe(inlineBubbleSendVerdict(state));
    }
  });
});

describe('InlineElementBubble signals (ONL-2455)', () => {
  test('nothing to say renders no band at all', () => {
    const html = render({ draft: 'why is this red' });
    expect(html).not.toContain('data-color="warning"');
    expect(html).not.toContain('data-color="error"');
  });

  test('a refused gather is polite', () => {
    const html = render({ status: { type: 'warning', message: 'Only 10 elements at a time' } });
    expect(bandTag(html, 'Only 10 elements at a time')).toContain('role="status"');
    expect(html).toContain('data-color="warning"');
    expect(html).not.toContain('role="alert"');
  });

  test('a send failure is assertive', () => {
    const html = render({ status: { type: 'error', message: 'That did not reach the session' } });
    expect(bandTag(html, 'That did not reach the session')).toContain('role="alert"');
    expect(html).toContain('data-color="error"');
  });

  test('a send failure keeps the retry sendable, so Enter re-sends the standing draft', () => {
    const state = { draft: 'why is this red', isSessionUsable: true, hasPayload: false } as const;
    expect(inlineBubbleSendVerdict(state)).toBe('send');
    const html = render({ ...state, status: { type: 'error', message: 'Did not reach the session' } });
    expect(sendTag(html)).not.toContain('disabled');
  });
});

describe('InlineElementBubble anchor (ONL-2593)', () => {
  test('carries no found-or-lost state: no mark, no header', () => {
    const html = render({ draft: 'why is this red' });
    expect(html).not.toContain('data-stale');
    expect(html).not.toContain('inline-element-bubble-stale');
  });
});

describe('InlineElementBubble pasted files (ONL-2549)', () => {
  test('a drawer carrying an attachment pill renders above the input on an empty draft', () => {
    const html = render({ drawer: <div data-testid="bubble-pill-row">hero-reference.png</div> });
    expect(html).toContain('hero-reference.png');
    expect(html.indexOf('bubble-pill-row')).toBeLessThan(html.indexOf('contentEditable="true"'));
  });

  test('offers its one editable as the paste target, with a file handler and without', () => {
    const withHandler = render({ onFiles: () => {} });
    expect(withHandler.match(/contentEditable="true"/g)).toHaveLength(1);
    // A behaviour prop: a bubble that sprouted a drop zone or a second target would read differently here.
    expect(withHandler).toBe(render());
  });
});

describe('InlineElementBubble surface (ONL-2455)', () => {
  test('the layer surface declares its own box, which a shrink-to-fit top layer cannot', () => {
    expect(render({ surface: 'layer' })).toContain('width:280px');
  });

  test('the gallery surface fills its frame and claims no top layer of its own', () => {
    const html = render({ surface: 'inline' });
    expect(html).not.toContain('width:280px');
    expect(rootTag(html)).not.toContain('popover');
    expect(rootTag(html)).not.toContain('position:fixed');
  });

  test('the layer surface claims no top layer either — the app owns the layer', () => {
    expect(rootTag(render({ surface: 'layer' }))).not.toContain('popover');
  });

  test('the composer opts out of the panel-wide square-radius rule', () => {
    expect(render()).toContain('inline-element-bubble-composer');
  });
});
