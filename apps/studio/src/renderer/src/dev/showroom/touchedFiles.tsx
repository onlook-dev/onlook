import { useEffect, useRef, useState } from 'react';
import { TouchedFiles } from '@studio/chat-ui';
import { CODE_REFUSAL_CODES, type CodeReadResult, type TouchedFileView } from '@studio/events';
import { TouchedFilePreview } from '../../chat/TouchedFilePreview.js';
import { touchedFileStrings } from '../../chat/touchedFileStrings.js';
import { ForwardIcon } from '../../icons/glyphs.js';
import { Focused, type Category } from './Showroom.js';

const RUNNING: readonly TouchedFileView[] = [
  { path: 'src/components/header/Button.tsx', status: 'editing' },
  { path: 'src/components/footer/Button.tsx', status: 'edited' },
  { path: 'src/theme.css', status: 'created' },
];

const TEXT: Extract<CodeReadResult, { ok: true }> = {
  ok: true,
  path: 'src/components/header/Button.tsx',
  text: 'export function Button() {\n  return <button>Explore the collection</button>;\n}\n',
  snapshot: { hash: 'showroom', size: 90, mtimeMs: 0, eol: '\n', mode: 0o644, bom: false },
};

const IMAGE_PATH = 'public/palette.svg';
const IMAGE: CodeReadResult = {
  ...TEXT,
  path: IMAGE_PATH,
  text: '',
  image: { dataUrl: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200"><rect width="360" height="200" fill="#f5efe4"/><circle cx="120" cy="100" r="60" fill="#286052"/><circle cx="240" cy="100" r="60" fill="#ef9468"/></svg>')}` },
};

function FileList({ files, focus, hover = false, width = 307, expanded = false, control = 'row' }: { files: readonly TouchedFileView[]; focus?: boolean; hover?: boolean; width?: number; expanded?: boolean; control?: 'row' | 'toggle' }): React.JSX.Element {
  const [path, setPath] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expanded) host.current?.querySelector<HTMLButtonElement>('[data-testid="touched-files-toggle"]')?.click();
  }, [expanded]);
  return (
    <Focused {...(focus || hover ? { selector: control === 'toggle' ? '[data-testid="touched-files-toggle"]' : '[data-testid="touched-file"]' } : {})} hover={hover}>
      <div ref={host} data-touched-files-hover={hover} style={{ width }}>
        <style>{'[data-touched-files-hover="true"] li:first-child > [data-testid="touched-file"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>
        <TouchedFiles files={files} isStreaming={files.some((file) => file.status === 'editing')} strings={touchedFileStrings()} onOpen={setPath} chevronIcon={ForwardIcon} />
      </div>
      <TouchedFilePreview path={path} result={path === null ? null : { ...TEXT, path }} onClose={() => setPath(null)} />
    </Focused>
  );
}

function Preview({ result, path = TEXT.path, closed = false, focusClose = false, hoverClose = false }: { result: CodeReadResult | null; path?: string; closed?: boolean; focusClose?: boolean; hoverClose?: boolean }): React.JSX.Element {
  const [selection, setSelection] = useState<string | null>(closed ? null : path);
  return (
    <Focused {...(focusClose ? { selector: '[data-testid="touched-file-preview-close"]' } : {})}>
      <div data-touched-preview-hover={hoverClose} style={{ width: 760, maxWidth: '92vw' }}>
        <style>{'[data-touched-preview-hover="true"] [data-testid="touched-file-preview-close"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>
        <TouchedFiles files={[{ path, status: 'edited' }]} strings={touchedFileStrings()} onOpen={setSelection} />
        <TouchedFilePreview path={selection} result={result} onClose={() => setSelection(null)} isInline />
      </div>
    </Focused>
  );
}

export const TOUCHED_FILES_CATEGORY: Category = {
  id: 'touched-files',
  title: 'Files changed',
  stories: [
    { id: 'touched-files-empty', title: 'Empty', render: () => <FileList files={[]} /> },
    { id: 'touched-files-running', title: 'Running', render: () => <FileList files={RUNNING} /> },
    { id: 'touched-files-completed', title: 'Completed', render: () => <FileList files={[{ path: RUNNING[0]!.path, status: 'edited', additions: 12, deletions: 4 }, { path: 'src/theme.css', status: 'created', additions: 24, deletions: 0 }, { path: 'src/legacy.css', status: 'deleted', additions: 0, deletions: 8 }]} /> },
    { id: 'touched-files-stopped', title: 'Stopped', render: () => <FileList files={[{ path: RUNNING[0]!.path, status: 'stopped' }, RUNNING[1]!]} /> },
    { id: 'touched-files-error', title: 'Failed and denied', render: () => <FileList files={[{ path: 'src/theme.css', status: 'failed' }, { path: 'src/locked.ts', status: 'denied' }]} /> },
    { id: 'touched-files-mixed', title: 'An edited file later denied · unknown total', render: () => <FileList files={[{ path: 'src/App.tsx', status: 'denied', hasSuccessfulChange: true }, { path: 'src/theme.css', status: 'created', additions: 2, deletions: 0 }]} /> },
    { id: 'touched-files-long-path', title: 'Long paths · 280px', render: () => <FileList width={280} files={[{ path: 'apps/storefront/src/components/collections/summer/featured-products/CollectionCardWithImageAndPrice.tsx', status: 'editing' }, { path: 'apps/admin/src/components/collections/summer/featured-products/CollectionCardWithImageAndPrice.tsx', status: 'edited' }]} /> },
    { id: 'touched-files-many', title: 'Many files · collapsed', render: () => <FileList files={Array.from({ length: 8 }, (_, index) => ({ path: `src/components/Section${String(index + 1)}.tsx`, status: 'edited', additions: index + 1, deletions: 1 }))} /> },
    { id: 'touched-files-expanded', title: 'Many files · expanded', render: () => <FileList expanded files={Array.from({ length: 5 }, (_, index) => ({ path: `src/Section${String(index + 1)}.tsx`, status: 'edited', additions: index + 1, deletions: 1 }))} /> },
    { id: 'touched-files-toggle-focus', title: 'Expand control · keyboard focus', render: () => <FileList focus control="toggle" files={Array.from({ length: 5 }, (_, index) => ({ path: `src/Section${String(index + 1)}.tsx`, status: 'edited', additions: index + 1, deletions: 1 }))} /> },
    { id: 'touched-files-hover', title: 'Hover', render: () => <FileList files={RUNNING} hover /> },
    { id: 'touched-files-focus', title: 'Keyboard focus', render: () => <FileList files={RUNNING} focus /> },
  ],
};

export const TOUCHED_FILE_PREVIEW_CATEGORY: Category = {
  id: 'touched-file-preview',
  title: 'Files changed — read-only preview',
  stories: [
    { id: 'touched-file-preview-text', title: 'Text', wide: true, render: () => <Preview result={TEXT} /> },
    { id: 'touched-file-preview-loading', title: 'Loading', wide: true, render: () => <Preview result={null} /> },
    { id: 'touched-file-preview-image', title: 'Image', wide: true, render: () => <Preview path={IMAGE_PATH} result={IMAGE} /> },
    ...CODE_REFUSAL_CODES.map((code) => ({ id: `touched-file-preview-${code}`, title: `Refused · ${code}`, wide: true, render: () => <Preview result={{ ok: false, code }} /> })),
    { id: 'touched-file-preview-close-focus', title: 'Close · keyboard focus', wide: true, render: () => <Preview result={TEXT} focusClose /> },
    { id: 'touched-file-preview-close-hover', title: 'Close · hover', wide: true, render: () => <Preview result={TEXT} hoverClose /> },
    { id: 'touched-file-preview-closed', title: 'Closed · reopen from the row', wide: true, render: () => <Preview result={TEXT} closed /> },
  ],
};
