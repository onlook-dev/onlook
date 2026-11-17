import { LEFT_PANEL_HEADER } from '../../panels/headerGeometry.js';
import { lazy, Suspense, useId, useRef, useState } from 'react';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Item } from '@astryxdesign/core/Item';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { codeImageMediaType, type CodeSearchFileMatches } from '@studio/events';
import { ShimmerText } from '@studio/chat-ui';

import { t } from '@studio/i18n';
import { useWorkspaceStore } from '../../workspace/store.js';
import { useCanvasStore } from '../../canvas/store.js';
import { PROJECT_IMAGE_DRAG_TYPE } from '../../canvas/image/projectFileDrag.js';
import { ChevronDownIcon, CloseIcon, FolderIcon, ForwardIcon, GlyphCross } from '../../icons/glyphs.js';
import { fileName } from '../breadcrumb.js';
import { FileTypeIcon } from './FileTypeIcon.js';
import { designKind, filesInScope, type FileScope } from './fileScope.js';
import { Highlighted } from './Highlighted.js';
import { ImageFileHoverPreview } from './ImageFileHoverPreview.js';
import { suggestedFiles } from './suggested.js';
import { treeRows } from './tree.js';
import './files.css';

const SyntaxSnippet = lazy(() => import('./SyntaxSnippet.js'));

export interface FilesViewProps {
  files: readonly string[];
  scope: FileScope;
  onScope: (scope: FileScope) => void;
  /** Non-empty while a term is typed; the tree is not drawn then. */
  query: string;
  onQuery: (query: string) => void;
  names: readonly string[];
  contents: readonly CodeSearchFileMatches[];
  isSearching: boolean;
  openPath: string | null;
  onOpen: (path: string, line?: number) => void;
  /** The mapper's answer, which is what puts the selection's own file first. */
  mappedFile?: string | null;
  /** Where the selection's component is declared, when the mapper found it. */
  componentFile?: string | null;
  /** What the mapped file imports directly, already resolved to files the project has. */
  relatedFiles?: readonly string[];
  /** Present once a file is open: the browser is a step aside from the code, not a dead end. */
  onClose?: () => void;
}

const ROW = { minHeight: 26, paddingInline: 'var(--spacing-2)' } as const;
const GLYPH = { width: 14, height: 14, flexShrink: 0 } as const;

/** A plain field, as the sidebar's own rename field is: Astryx ships no input. */
const SEARCH: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  background: 'transparent',
  border: 0,
  outline: 'none',
  color: 'var(--color-text-primary)',
  font: 'inherit',
  fontSize: 'var(--text-supporting-size)',
  padding: 0,
  boxSizing: 'border-box',
};

export function FilesView({
  files,
  scope,
  onScope,
  query,
  onQuery,
  names,
  contents,
  isSearching,
  openPath,
  onOpen,
  mappedFile = null,
  componentFile = null,
  relatedFiles,
  onClose,
}: FilesViewProps): React.JSX.Element {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const suggestedId = useId();
  const [isSuggestedOpen, setSuggestedOpen] = useState(true);
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());
  const inScope = filesInScope(files, scope);
  const projectLabel = scope === 'design' ? t('code.files.group.projectDesign') : t('code.files.group.project');
  const scopedNames = names.filter((path) => scope === 'all' || designKind(path) !== null);
  const scopedContents = contents.filter((file) => scope === 'all' || designKind(file.path) !== null);
  const isSearch = query.trim().length > 0;
  const rows = treeRows(inScope, { openPath, overrides, isExpandedAll: isSearch });
  const suggested = suggestedFiles({
    files: inScope,
    mappedFile,
    componentFile,
    ...(relatedFiles === undefined ? {} : { related: relatedFiles }),
  });
  const nothingFound = isSearch && !isSearching && scopedNames.length === 0 && scopedContents.length === 0;

  const toggle = (path: string, isOpen: boolean): void => {
    setOverrides((current) => {
      const next = new Map(current);
      next.set(path, !isOpen);
      return next;
    });
  };

  return (
    <VStack height="100%" data-testid="code-files" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}
      onDragStart={(event: React.DragEvent) => {
        const path = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-path]')?.dataset.path : undefined;
        const workspacePath = useWorkspaceStore.getState().workspace?.workspacePath;
        if (path === undefined || codeImageMediaType(path) === null || workspacePath === undefined) return;
        event.dataTransfer.setData(PROJECT_IMAGE_DRAG_TYPE, JSON.stringify({ path, workspacePath }));
        event.dataTransfer.effectAllowed = 'copy';
        // Shield live frames before the pointer reaches the canvas.
        useCanvasStore.getState().noteFileDrag('elsewhere');
      }}>
      <ImageFileHoverPreview key={`${scope}:${query}`} />
      {onClose !== undefined && (
        <HStack
          align="center"
          justify="between"
          style={{ flexShrink: 0, paddingInlineStart: LEFT_PANEL_HEADER.paddingInline, paddingInlineEnd: 'var(--spacing-2)', paddingBlockStart: 'var(--spacing-2)' }}
        >
          <Text size="sm" color="primary" weight="semibold">
            {t('code.files.title')}
          </Text>
          <IconButton
            variant="ghost"
            size="sm"
            label={t('code.files.close')}
            tooltip={t('code.files.close')}
            icon={<CloseIcon />}
            onClick={onClose}
            data-testid="code-files-close"
          />
        </HStack>
      )}

      <HStack align="center" gap={0.5} className="code-files-search-toolbar">
        {/* ONE search over both names and lines: two fields would make a designer
            choose which kind of thing they are looking for before they look. */}
        <HStack align="center" className="code-files-search-field">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => {
              onQuery(event.target.value);
            }}
            placeholder={t('code.files.search')}
            aria-label={t('code.files.search')}
            data-testid="code-files-search"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query !== '') {
                event.preventDefault();
                onQuery('');
              }
            }}
            style={SEARCH}
          />
          {query === '' && (
            <div className="code-files-search-placeholder" aria-hidden="true" data-testid="code-files-search-placeholder">
              <ShimmerText isActive type="supporting" weight="normal" hasGlow={false} maxLines={1}
                base="var(--color-text-disabled)" crest="var(--color-text-secondary)"
                periodCh={36} crestCh={5} sweepMs={6000}>
                {t('code.files.search')}
              </ShimmerText>
            </div>
          )}
          {query !== '' && (
            <button
              type="button"
              className="search-clear"
              aria-label={t('code.files.clear')}
              title={t('code.files.clear')}
              data-testid="code-files-clear"
              onClick={() => {
                onQuery('');
                searchRef.current?.focus({ preventScroll: true });
              }}
            >
              <GlyphCross size={18} />
            </button>
          )}
        </HStack>
        <div className="code-files-scope">
        <ToggleButtonGroup
          label={t('code.files.scope.label')}
          type="single"
          size="sm"
          value={scope}
          onChange={(next) => {
            if (next === 'design' || next === 'all') onScope(next);
          }}
          data-testid="code-files-scope"
        >
          <ToggleButton value="design" label={t('code.files.scope.design')}>
            <Text type="supporting" weight="medium">{t('code.files.scope.design')}</Text>
          </ToggleButton>
          <ToggleButton value="all" label={t('code.files.scope.all')}>
            <Text type="supporting" weight="medium">{t('code.files.scope.all')}</Text>
          </ToggleButton>
        </ToggleButtonGroup>
        </div>
      </HStack>

      <VStack gap={0} data-testid="code-files-content" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
      {isSearching && (
        <Text type="supporting" color="secondary" style={{ padding: 'var(--spacing-2)' }}>
          {t('code.files.searching')}
        </Text>
      )}

      {nothingFound && (
        <Text
          type="supporting"
          color="secondary"
          data-testid="code-files-empty"
          style={{ padding: 'var(--spacing-2)' }}
        >
          {t('code.files.noMatches')}
        </Text>
      )}

      {!isSearch && suggested.length > 0 && (
        <VStack hidden gap={0} data-testid="code-files-suggested" className="code-files-suggested">
          <button type="button" aria-expanded={isSuggestedOpen} aria-controls={suggestedId}
            data-testid="code-files-suggested-toggle" onClick={() => setSuggestedOpen(!isSuggestedOpen)}
            className="code-files-suggested-toggle">
            <Text type="supporting" weight="semibold">{t('code.files.group.suggested')}</Text>
            <span className="code-files-suggested-count">{String(suggested.length)}</span>
            <ChevronDownIcon className="code-files-suggested-chevron" style={GLYPH} />
          </button>
          <div id={suggestedId} className="code-files-suggested-body" data-open={isSuggestedOpen}
            inert={!isSuggestedOpen} aria-hidden={!isSuggestedOpen}>
          <div className="code-files-suggested-clip">
          <div className="code-files-shortcuts">
          {suggested.map((path) => (
            <button
              type="button"
              key={`suggested-${path}`}
              className="code-files-shortcut"
              data-testid="code-files-suggestion"
              data-path={path}
              data-selected={path === openPath ? 'true' : undefined}
              aria-current={path === openPath ? 'true' : undefined}
              aria-label={path}
              title={path}
              onClick={() => onOpen(path)}
            >
              <FileTypeIcon path={path} />
              <Text size="sm" maxLines={1}>{fileName(path)}</Text>
            </button>
          ))}
          </div>
          </div>
          </div>
        </VStack>
      )}

      {isSearch ? (
        <VStack gap={0}>
          {scopedNames.length > 0 && <Group label={t('code.files.group.names')} />}
          {scopedNames.map((path) => (
            <Item
              key={path}
              as="div"
              role="button"
              tabIndex={0}
              label={<Highlighted text={fileName(path)} query={query} />}
              description={path}
              startContent={<FileTypeIcon path={path} />}
              data-testid="code-files-name"
              draggable={codeImageMediaType(path) !== null}
              data-path={path}
              onClick={() => {
                onOpen(path);
              }}
              style={ROW}
            />
          ))}
          {scopedContents.length > 0 && <Group label={t('code.files.group.lines')} />}
          {scopedContents.map((file) => (
            <VStack key={file.path} gap={0} className="code-search-file" data-testid="code-search-file">
              <HStack align="center" gap={2} className="code-search-file-heading">
                <FileTypeIcon path={file.path} />
                <VStack gap={0} style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <Text type="body" color="primary" maxLines={1}>{fileName(file.path)}</Text>
                  <Text type="supporting" color="secondary" maxLines={1}>{file.path}</Text>
                </VStack>
                <Text type="supporting" color="secondary" className="code-search-count">{String(file.total)}</Text>
              </HStack>
              {file.lines.map((line) => (
                <button
                  key={`${file.path}:${String(line.line)}`}
                  type="button"
                  className="code-search-line"
                  data-testid="code-files-line"
                  data-path={file.path}
                  data-line={line.line}
                  title={`${file.path}:${String(line.line)}\n${line.text}`}
                  onClick={() => onOpen(file.path, line.line)}
                >
                  <span className="code-search-line-number">{String(line.line)}</span>
                  <span className="code-search-line-content">
                    <Suspense fallback={<Highlighted text={line.text.trimStart()} query={query} />}>
                      <SyntaxSnippet path={file.path} text={line.text.trimStart()} query={query} />
                    </Suspense>
                  </span>
                </button>
              ))}
            </VStack>
          ))}
        </VStack>
      ) : (
        <VStack gap={1}>
          <Group label={projectLabel} />
          <VStack gap={0} data-testid="code-files-tree" role="tree" aria-label={projectLabel}>
          {rows.map((row) =>
            row.kind === 'file' ? (
              <FileRow
                key={row.path}
                path={row.path}
                label={row.label}
                depth={row.depth}
                isOpen={row.path === openPath}
                testId="code-files-file"
                onOpen={onOpen}
              />
            ) : (
              <Item
                key={row.path}
                as="div"
                role="treeitem"
                tabIndex={0}
                aria-expanded={row.isOpen === true}
                label={row.label}
                startContent={
                  <HStack align="center" gap={0.5} style={{ flexShrink: 0 }}>
                    {row.isOpen === true ? (
                      <ChevronDownIcon style={{ ...GLYPH, color: 'var(--color-text-secondary)' }} />
                    ) : (
                      <ForwardIcon style={{ ...GLYPH, color: 'var(--color-text-secondary)' }} />
                    )}
                    <FolderIcon style={{ ...GLYPH, color: 'var(--color-text-secondary)' }} />
                  </HStack>
                }
                data-testid="code-files-folder"
                data-path={row.path}
                data-expanded={row.isOpen === true ? 'true' : 'false'}
                onClick={() => {
                  toggle(row.path, row.isOpen === true);
                }}
                style={{ ...ROW, paddingInlineStart: `calc(var(--spacing-2) + ${String(row.depth * 12)}px)` }}
              />
            ),
          )}
          </VStack>
        </VStack>
      )}
      </VStack>
    </VStack>
  );
}

function FileRow({
  path,
  label,
  depth,
  isOpen,
  testId,
  onOpen,
}: {
  path: string;
  label: string;
  depth: number;
  isOpen: boolean;
  testId: string;
  onOpen: (path: string) => void;
}): React.JSX.Element {
  return (
    <Item
      as="div"
      role="treeitem"
      tabIndex={0}
      aria-current={isOpen ? 'true' : undefined}
      label={label}
      startContent={<FileTypeIcon path={path} />}
      data-testid={testId}
      draggable={codeImageMediaType(path) !== null}
      data-path={path}
      data-selected={isOpen ? 'true' : undefined}
      onClick={() => {
        onOpen(path);
      }}
      // The disclosure's own width, so a file lines up under its folder's name rather than its chevron.
      style={{ ...ROW, paddingInlineStart: `calc(var(--spacing-2) + ${String(depth * 12 + 18)}px)` }}
    />
  );
}

function Group({ label }: { label: string }): React.JSX.Element {
  return (
    <Text
      type="supporting"
      color="secondary"
      style={{ paddingInlineStart: 'var(--spacing-2)', paddingInlineEnd: 'var(--spacing-2)', paddingBlockStart: 'var(--spacing-2)' }}
    >
      {label}
    </Text>
  );
}
