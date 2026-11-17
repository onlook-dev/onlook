import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import type { CodeMapping, CodeRefusalCode } from '@studio/events';

import { CodePanel } from '../../code/CodePanel.js';
import { CodeLoading } from '../../code/CodeLoading.js';
import { FilesView } from '../../code/files/FilesView.js';
import { SelectionLabel } from '../../code/SelectionLabel.js';
import { tintLabel } from '../../code/tintLabel.js';
import type { CodeTabFacts } from '../../code/TabRow.js';
import { REGION } from '../../layout.js';
import { noop, type Category, type Gallery, type Story } from './Showroom.js';

const PROJECT = 'acme-shop';

/** The frame the aside gives it: over the canvas ground, clipped as the panel is. */
const PANEL: React.CSSProperties = {
  width: REGION.code,
  height: 320,
  flex: '0 0 auto',
  overflow: 'hidden',
  border: 'var(--border-width) solid var(--color-border)',
  borderRadius: 'var(--radius-element)',
  background: 'var(--studio-ground)',
};

function tab(path: string, isDirty = false): CodeTabFacts {
  return { path, name: path.split('/').pop() ?? path, isDirty };
}

const MANY: readonly CodeTabFacts[] = [
  tab('src/components/Button.tsx'),
  tab('src/components/Card.tsx'),
  tab('src/styles/tokens.css'),
  tab('src/routes/checkout/page.tsx'),
  tab('README.md'),
];

function Still({
  tabs,
  activePath,
  refusal = null,
  label,
}: {
  tabs: readonly CodeTabFacts[];
  activePath: string | null;
  refusal?: CodeRefusalCode | null;
  label?: React.ReactNode;
}): React.JSX.Element {
  return (
    <HStack style={PANEL}>
      <CodePanel
        projectName={PROJECT}
        tabs={tabs}
        activePath={activePath}
        refusal={refusal}
        onActivate={noop}
        onClose={noop}
        isBrowsing={false}
        onBrowse={noop}
        {...(label === undefined ? {} : { tintLabel: label })}
      />
    </HStack>
  );
}

function mapping(over: Partial<CodeMapping> = {}): CodeMapping {
  return {
    path: 'src/components/Button.tsx',
    line: 14,
    column: 3,
    via: 'owner-stack',
    definition: null,
    grade: 'exact',
    component: 'Button',
    others: [],
    uses: 0,
    produced: 1,
    producedComplete: true,
    ...over,
  };
}

function Selected({
  over = {},
  isStale = false,
  declined = false,
}: {
  over?: Partial<CodeMapping>;
  isStale?: boolean;
  declined?: boolean;
}): React.JSX.Element {
  const held = declined ? null : mapping(over);
  return (
    <Still
      tabs={[tab('src/components/Button.tsx')]}
      activePath="src/components/Button.tsx"
      label={
        <SelectionLabel
          label={tintLabel({ mapping: held, isStale })}
          others={held?.others ?? []}
          sourceElsewhere={held}
          onOpen={noop}
        />
      }
    />
  );
}

function story(id: string, title: string, note: string, render: () => React.ReactNode): Story {
  return { id: `code-gallery-${id}`, title, note, render };
}

const PROJECT_FILES = [
  'src/styles/tokens.css',
  'src/components/Button.tsx',
  'src/components/Card.tsx',
  'src/routes/checkout/page.tsx',
  'README.md',
  'package.json',
];

function Browser({
  query = '',
  openPath = null,
  mappedFile,
  componentFile = null,
  relatedFiles = [],
  onClose,
}: {
  query?: string;
  openPath?: string | null;
  mappedFile?: string | null;
  componentFile?: string | null;
  relatedFiles?: readonly string[];
  onClose?: () => void;
}): React.JSX.Element {
  const hits =
    query === ''
      ? []
      : [
          {
            path: 'src/components/Button.tsx',
            total: 2,
            lines: [
              { line: 14, text: "  const label = t('checkout.pay');", column: 18 },
              { line: 31, text: '  return <button className="pay">{label}</button>;', column: 24 },
            ],
          },
        ];
  return (
    <HStack style={PANEL}>
      <FilesView
        files={PROJECT_FILES}
        scope="design"
        onScope={noop}
        query={query}
        onQuery={noop}
        names={query === '' ? [] : ['src/routes/checkout/page.tsx']}
        contents={hits}
        isSearching={false}
        openPath={openPath}
        mappedFile={mappedFile ?? openPath}
        componentFile={componentFile}
        relatedFiles={relatedFiles}
        onOpen={noop}
        {...(onClose === undefined ? {} : { onClose })}
      />
    </HStack>
  );
}

const SAMPLE_TSX = `import { useState } from 'react';
import type { Product } from './types.js';

// The row the canvas pick maps to.
export function Price({ product }: { product: Product }): React.JSX.Element {
  const [count, setCount] = useState(1);
  return (
    <p className="price" onClick={() => setCount(count + 1)}>
      {formatPrice(product.amount * count)}
    </p>
  );
}
`;

const SAMPLE_CSS = `:root {
  /* The brand colour, which the swatch opens. */
  --brand: #c8452d;
  --radius: 8px;
}

.price {
  color: var(--brand);
  font-size: 15px;
}
`;

const CodeArea = lazy(async () => {
  const module = await import('../../code/CodeArea.js');
  return { default: module.CodeArea };
});

/** The editor itself, which is where the palette, the tint and the swatch are. */
function Editing({ path, text, tint }: { path: string; text: string; tint?: { start: number; end: number } }): React.JSX.Element {
  return (
    <HStack style={PANEL}>
      <Suspense fallback={null}>
        <CodeArea path={path} text={text} eol={'\n'} tint={tint ?? null} focusLine={null} onChange={noop} />
      </Suspense>
    </HStack>
  );
}

function ChangePreview({ edited = false, focused = false, source = false }: { edited?: boolean; focused?: boolean; source?: boolean }): React.JSX.Element {
  const [text, setText] = useState(SAMPLE_TSX);
  const [sourceVisible, setSourceVisible] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!source || !host.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.intersectionRatio === 1)) setSourceVisible(true);
    }, { threshold: 1 });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [source]);
  useEffect(() => {
    if (!edited && !focused) return;
    let hold: number | undefined;
    const ready = window.setInterval(() => {
      const content = host.current?.querySelector<HTMLElement>('.cm-content');
      if (!content) return;
      window.clearInterval(ready);
      if (focused) content.focus({ preventScroll: true });
      if (!edited) return;
      setText(SAMPLE_TSX.replace('useState(1)', 'useState(2)'));
      hold = window.setTimeout(() => {
        for (const animation of host.current?.getAnimations({ subtree: true }) ?? []) {
          animation.pause();
          animation.currentTime = 350;
        }
      }, 100);
    }, 50);
    return () => { window.clearInterval(ready); window.clearTimeout(hold); };
  }, [edited, focused]);
  const path = 'src/components/Price.tsx';
  return <div ref={host} style={{ ...PANEL, height: 410 }}>
    <CodePanel projectName={PROJECT} tabs={[tab(path)]} activePath={path} refusal={null}
      onActivate={noop} onClose={noop} isBrowsing={false} onBrowse={noop}
      body={<Suspense fallback={null}><CodeArea path={path} text={text} eol={'\n'} tint={null}
        animateChanges={edited} focusLine={sourceVisible ? 8 : null} onChange={noop} /></Suspense>} />
  </div>;
}

const CATEGORIES: Category[] = [
  {
    id: 'changes', title: 'Code updates (ONL-2575)', stories: [
      story('change-rest', 'An open file', 'the editor and header keep their normal treatment', () => <ChangePreview />),
      story('change-edited', 'An agent edit', 'the real edited-line animation held during its fading accent', () => <ChangePreview edited />),
      story('change-focus', 'Keyboard focus', 'focus stays inside the editor while its header stays aligned', () => <ChangePreview focused />),
      story('change-source', 'Source reveal', 'teal marks the revealed source line without selecting its text', () => <ChangePreview source />),
    ],
  },
  {
    id: 'editor',
    title: 'The editor and its palette (ONL-2563)',
    stories: [
      story('tinted', 'The mapped line', 'the line a pick resolved to keeps a teal ground and takes the gutter with it', () => (
        <Editing path="src/components/Price.tsx" text={SAMPLE_TSX} tint={{ start: 8, end: 8 }} />
      )),
      story('palette', 'Every token kind', 'keyword, type, string, number, call and comment, each on the design’s own text colour', () => (
        <Editing path="src/components/Price.tsx" text={SAMPLE_TSX} />
      )),
      story('swatch', 'A colour is a swatch', 'a hex in a stylesheet carries its own swatch, which opens a picker', () => (
        <Editing path="src/styles/tokens.css" text={SAMPLE_CSS} />
      )),
    ],
  },
  {
    id: 'shell',
    title: 'The code view’s shell (ONL-2563)',
    stories: [
      story('loading', 'Opening a file', 'the active file is named while its read or editor module is pending', () => (
        <HStack style={PANEL}>
          <CodePanel projectName={PROJECT} tabs={[tab('src/components/Button.tsx')]} activePath="src/components/Button.tsx"
            refusal={null} onActivate={noop} onClose={noop} isBrowsing={false} onBrowse={noop} body={<CodeLoading />} />
        </HStack>
      )),
      story('empty', 'Nothing open', 'no tab row at all; the slice that lists the project’s files fills this body', () => (
        <Still tabs={[]} activePath={null} />
      )),
      story('one', 'One tab', 'the breadcrumb under the project’s name, and the path’s own folders after it', () => (
        <Still tabs={[tab('src/components/Button.tsx')]} activePath="src/components/Button.tsx" />
      )),
      story('refused', 'The file was refused', 'the shell words every refusal the bridge answers with', () => (
        <Still tabs={[tab('public/logo.png')]} activePath="public/logo.png" refusal="not-text" />
      )),
    ],
  },
  {
    id: 'tabrow',
    title: 'The row of open files (ONL-2563)',
    stories: [
      story('clash', 'A clash behind you', 'the file in front carries the banner; a file written behind it marks its own tab', () => (
        <Still
          tabs={[
            tab('src/components/Button.tsx', true),
            { ...tab('src/components/Card.tsx', true), hasClash: true },
            ...MANY.slice(2),
          ]}
          activePath="src/components/Button.tsx"
        />
      )),
      story('dirty', 'A dirty tab', 'the dot stands where the ✕ goes; hover the tab and they swap', () => (
        <Still
          tabs={[tab('src/components/Button.tsx', true), tab('src/components/Card.tsx', true), ...MANY.slice(2)]}
          activePath="src/components/Button.tsx"
        />
      )),
      story('many', 'Many tabs', 'the row scrolls sideways; the active tab is the one with ink', () => (
        <Still tabs={MANY} activePath="src/styles/tokens.css" />
      )),
      story('long', 'A long file name', 'the label’s tail fades under the ✕ rather than being cut, and the breadcrumb collapses its middle to one ellipsis', () => (
        <Still
          tabs={[tab('apps/studio/src/renderer/src/code/CodePanelSurface.tsx'), ...MANY]}
          activePath="apps/studio/src/renderer/src/code/CodePanelSurface.tsx"
        />
      )),
    ],
  },
  {
    id: 'browser',
    title: 'The files browser (ONL-2563)',
    stories: [
      story('tree', 'Browsing', 'folders act: a disclosure, a folder glyph, and the files under whichever one is open', () => (
        <Browser />
      )),
      story(
        'related',
        'With a selection whose component lives elsewhere',
        'the mapped file, where its component is declared, and what both of them import — answered with neither file open',
        () => (
          <Browser
            mappedFile="src/routes/checkout/page.tsx"
            componentFile="src/components/Button.tsx"
            relatedFiles={['src/styles/tokens.css', 'src/components/Card.tsx']}
          />
        ),
      ),
      story('suggested', 'With a selection', 'the file the selection mapped to leads, then the design files', () => (
        <Browser openPath="src/components/Button.tsx" />
      )),
    ],
  },
  {
    id: 'search',
    title: 'Searching, and getting back (ONL-2563)',
    stories: [
      story('typed', 'A term typed', 'one search over names and lines; the match is marked where it was found', () => (
        <Browser query="label" />
      )),
      story('overCode', 'Reached from an open file', 'the project’s name opens this over the code, and the ✕ puts it back', () => (
        <Browser openPath="src/components/Button.tsx" onClose={noop} />
      )),
    ],
  },
  {
    id: 'selection',
    title: 'What the panel says about the selection (ONL-2563)',
    stories: [
      story('exact', 'Exact', 'one source-mapped line in one file, and the tab’s buffer still matches it', () => (
        <Selected />
      )),
      story('likely', 'Likely', 'a name match, or a list row, or a buffer that has moved under the mapping', () => (
        <Selected over={{ grade: 'likely' }} />
      )),
      story('guess', 'Best guess, with the other places', 'several files declare the same name, and each one is a press away', () => (
        <Selected
          over={{
            grade: 'best-guess',
            via: 'name-search',
            others: [
              { path: 'src/legacy/Button.tsx', line: 8, column: 1, via: 'name-search' },
              { path: 'src/ui/Button.tsx', line: 22, column: 1, via: 'name-search' },
            ],
          }}
        />
      )),
      story('stale', 'The element is gone', 'the lines stay lit — the designer is still editing them — and the claim about them goes', () => (
        <Selected over={{ uses: 3 }} isStale />
      )),
      story('reach', 'An edit here reaches further', 'a list’s one line, which draws every row it produced', () => (
        <Selected over={{ component: 'Row', grade: 'likely', produced: 4 }} />
      )),
      story('reach-partial', 'A partial count', 'the bounded reader found two elements but cannot count the whole tree', () => (
        <Selected over={{ component: 'Row', grade: 'likely', produced: 2, producedComplete: false }} />
      )),
      story('reach-unknown', 'Uniqueness is unconfirmed', 'one observed element does not prove that an edit affects only one place', () => (
        <Selected over={{ component: 'Row', grade: 'likely', produced: 1, producedComplete: false }} />
      )),
      story('dom-fallback', 'A ranked markup guess', 'tag, classes and text suggest source without React identity', () => (
        <Selected over={{ component: null, grade: 'best-guess', via: 'element-search', others: [{ path: 'src/other.html', line: 12, column: 1, via: 'element-search' }] }} />
      )),
      story('declined', 'Studio could not place it', 'one sentence when nothing matches or nothing survives the clamp', () => (
        <Selected declined />
      )),
    ],
  },
];

export const CODE_GALLERY: Gallery = {
  id: 'code',
  title: 'Code',
  subtitle: 'The left panel’s code view: the path, the open files, and what the active one says.',
  categories: CATEGORIES,
};
