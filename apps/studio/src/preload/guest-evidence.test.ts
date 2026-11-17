import { describe, expect, it } from 'bun:test';
import { EVIDENCE_FRAME_URL_MAX, EVIDENCE_OUTER_HTML_MAX, parseElementEvidence, seedOf } from '@studio/events';
import {
  domPathOf,
  evidenceOf,
  mintPickId,
  relocate,
  truncate,
  type PickNode,
  type PickRoot,
} from './guest-evidence.js';

function node(
  tagName: string,
  opts: { classes?: string[]; text?: string; html?: string; children?: PickNode[] } = {},
): PickNode {
  const self: PickNode = {
    tagName: tagName.toUpperCase(),
    parentElement: null,
    children: opts.children ?? [],
    classList: opts.classes ?? [],
    textContent: opts.text ?? '',
    outerHTML: opts.html ?? `<${tagName}></${tagName}>`,
  };
  for (const child of opts.children ?? []) {
    (child as { parentElement: PickNode | null }).parentElement = self;
  }
  return self;
}

function root(byPath: Record<string, PickNode>, byTag: Record<string, PickNode[]>): PickRoot {
  return {
    querySelector: (selector) => byPath[selector] ?? null,
    querySelectorAll: (selector) => byTag[selector.toLowerCase()] ?? [],
  };
}

describe('truncate', () => {
  it('leaves a short value alone', () => {
    expect(truncate('<button>Buy</button>', 100)).toBe('<button>Buy</button>');
  });

  it('keeps head AND tail so closing tags survive', () => {
    const long = `<div class="${'x'.repeat(100)}">body</div>`;
    const out = truncate(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.startsWith('<div class=')).toBe(true);
    expect(out.endsWith('</div>')).toBe(true);
    expect(out).toContain('...');
  });
});

describe('domPathOf', () => {
  it('counts position among same-tag siblings only', () => {
    const target = node('button', { classes: ['cta'] });
    const body = node('body', {
      children: [node('span'), node('button'), target, node('div')],
    });
    node('html', { children: [body] });
    expect(domPathOf(target)).toBe(
      'html > body:nth-of-type(1) > button:nth-of-type(2)',
    );
  });

  it('handles a root-only node', () => {
    expect(domPathOf(node('html'))).toBe('html');
  });
});

describe('evidenceOf', () => {
  it('captures what the agent needs to find the source', () => {
    const el = node('button', {
      classes: ['cta', 'primary'],
      text: '  Buy now  ',
      html: '<button class="cta primary">Buy now</button>',
    });
    node('body', { children: [el] });

    const evidence = evidenceOf(el, 'el-1', 'http://localhost:3000/pricing');
    expect(evidence.kind).toBe('element');
    expect(evidence.tag).toBe('button');
    expect(evidence.classes).toEqual(['cta', 'primary']);
    expect(evidence.textContent).toBe('Buy now');
    expect(evidence.frameUrl).toBe('http://localhost:3000/pricing');
    expect(evidence.domPath).toContain('button:nth-of-type(1)');
  });

  it('bounds a huge element so one pick cannot swamp the prompt', () => {
    const el = node('div', { html: `<div>${'a'.repeat(50_000)}</div>` });
    const evidence = evidenceOf(el, 'el-2', 'http://localhost:3000/');
    expect(evidence.outerHtmlSnippet.length).toBeLessThanOrEqual(EVIDENCE_OUTER_HTML_MAX);
  });

  it('removes URL secrets and credential-bearing attributes before budgeting', () => {
    const el = node('input', {
      html: '<input type="password" value="hunter2" data-api-token="secret" class="field">',
    });
    const evidence = evidenceOf(
      el,
      'el-secret',
      `https://user:pass@example.test/form?token=${'x'.repeat(EVIDENCE_FRAME_URL_MAX)}#private`,
    );
    expect(evidence.frameUrl).toBe('https://example.test/form');
    expect(evidence.outerHtmlSnippet).not.toContain('hunter2');
    expect(evidence.outerHtmlSnippet).not.toContain('secret');
    expect(evidence.outerHtmlSnippet).toContain('[redacted]');

    const textarea = evidenceOf(
      node('textarea', { text: 'private note', html: '<textarea>private note</textarea>' }),
      'el-textarea',
      'http://localhost:3000/',
    );
    expect(textarea.textContent).toBe('');
    expect(textarea.outerHtmlSnippet).not.toContain('private note');
  });

  it('does not leak descendant form values when an ancestor is selected', () => {
    const form = node('form', {
      text: 'Public label private note',
      html: '<form><label>Public label</label><textarea>private note</textarea></form>',
    });
    const evidence = evidenceOf(form, 'el-form', 'http://localhost:3000/');
    expect(evidence.textContent).toBe('');
    expect(evidence.outerHtmlSnippet).not.toContain('private note');
    expect(evidence.outerHtmlSnippet).toContain('[redacted]');
  });

  it('removes credentials, query strings, and fragments from URL attributes', () => {
    const link = node('a', {
      html: '<a href="https://user:pass@example.test/file?signature=secret#private"><img src="https://cdn.test/image.png?token=secret"></a>',
    });
    const evidence = evidenceOf(link, 'el-link', 'http://localhost:3000/');
    expect(evidence.outerHtmlSnippet).toContain('href="https://example.test/file"');
    expect(evidence.outerHtmlSnippet).toContain('src="https://cdn.test/image.png"');
    expect(evidence.outerHtmlSnippet).not.toContain('secret');
    expect(evidence.outerHtmlSnippet).not.toContain('user:pass');
  });

  it('minimizes protocol-relative URLs and every srcset candidate', () => {
    const picture = node('picture', {
      html: '<picture><source srcset="//user:pass@cdn.test/small.png?token=one 1x, https://user:pass@cdn.test/large.png?token=two#private 2x"><img src="//user:pass@cdn.test/fallback.png?token=three"></picture>',
    });
    const evidence = evidenceOf(picture, 'el-picture', 'http://localhost:3000/');
    expect(evidence.outerHtmlSnippet).toContain(
      'srcset="//cdn.test/small.png 1x, https://cdn.test/large.png 2x"',
    );
    expect(evidence.outerHtmlSnippet).toContain('src="//cdn.test/fallback.png"');
    expect(evidence.outerHtmlSnippet).not.toContain('user:pass');
    expect(evidence.outerHtmlSnippet).not.toContain('token=');
    expect(evidence.outerHtmlSnippet).not.toContain('#private');
  });

  it('redacts an entire srcset when a comma-bearing data URL makes it ambiguous', () => {
    const source = node('source', {
      html: '<source srcset="data:image/svg+xml;base64,SECRET-PAYLOAD 1x, https://cdn.test/safe.png 2x">',
    });
    const evidence = evidenceOf(source, 'el-data-srcset', 'http://localhost:3000/');
    expect(evidence.outerHtmlSnippet).toContain('srcset="[redacted]"');
    expect(evidence.outerHtmlSnippet).not.toContain('SECRET-PAYLOAD');
  });

  it('admits a pick whose markup holds an apostrophe inside a quoted value', () => {
    const cases = [
      { html: `<input value="don't miss out">`, hidden: "don't" },
      { html: `<p data-author="O'Brien" data-v-7ba5bd90="">Quote</p>`, hidden: "O'Brien" },
      { html: `<a href="/guides/what's-new?ref=nav">What's new</a>`, hidden: 'ref=nav' },
      { html: `<div style="font-family: 'Inter', sans-serif">Card</div>`, hidden: 'Inter' },
    ];
    for (const { html, hidden } of cases) {
      const evidence = evidenceOf(node('p', { html }), 'el-quote', 'http://localhost:3000/');
      expect(evidence.outerHtmlSnippet).not.toContain(hidden);
      expect(parseElementEvidence(evidence)).not.toBeNull();
    }
  });
});

describe('mintPickId', () => {
  it('mints distinct ids from what a page outside a secure context offers, which has no randomUUID', () => {
    const insecurePageCrypto = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    const first = mintPickId(insecurePageCrypto);
    const second = mintPickId(insecurePageCrypto);
    expect(first).not.toBe(second);
    expect(evidenceOf(node('div'), first, 'http://0.0.0.0:3000/').id).toBe(first);
  });
});

describe('relocate', () => {
  const target = node('button', { classes: ['cta'], text: 'Buy now' });
  const seed = seedOf(evidenceOf(target, 'el-1', 'http://localhost:3000/'));

  it('rejects a path decoy and resolves one continuity-matching fallback', () => {
    const decoy = node('button', { classes: ['other'], text: 'different' });
    const moved = node('button', { classes: ['cta'], text: 'Buy now' });
    const found = relocate(seed, root({ [seed.domPath]: decoy }, { button: [decoy, moved] }));
    expect(found).toBe(moved);
  });

  it('preserves the connected selected node through its own text and class edits', () => {
    const edited = node('button', { classes: ['new'], text: 'Purchased' });
    (edited as PickNode & { isConnected: boolean }).isConnected = true;
    expect(relocate(seed, root({ [seed.domPath]: node('button') }, { button: [] }), edited)).toBe(
      edited,
    );
  });

  it('accepts a sole same-tag path replacement after both text and classes change', () => {
    const replacement = node('button', { classes: ['new'], text: 'Purchased' });
    expect(
      relocate(seed, root({ [seed.domPath]: replacement }, { button: [replacement] })),
    ).toBe(replacement);
  });

  it('falls back to tag + classes + text when the path moved', () => {
    const rerendered = node('button', { classes: ['cta'], text: 'Buy now' });
    const found = relocate(seed, root({}, { button: [node('button'), rerendered] }));
    expect(found).toBe(rerendered);
  });

  it('returns nothing when the fallback is ambiguous — stale beats wrong', () => {
    const twin1 = node('button', { classes: ['cta'], text: 'Buy now' });
    const twin2 = node('button', { classes: ['cta'], text: 'Buy now' });
    expect(relocate(seed, root({}, { button: [twin1, twin2] }))).toBeNull();
  });

  it('treats a malformed path as a miss rather than throwing', () => {
    const thrower: PickRoot = {
      querySelector: () => {
        throw new SyntaxError('bad selector');
      },
      querySelectorAll: () => [],
    };
    expect(relocate(seed, thrower)).toBeNull();
  });

  it('does not match an element whose tag differs', () => {
    const other = node('div', { classes: ['cta'], text: 'Buy now' });
    expect(relocate(seed, root({}, { button: [other] }))).toBeNull();
  });
});
