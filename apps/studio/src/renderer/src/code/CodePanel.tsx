import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { CodeRefusalCode } from '@studio/events';

import { t } from '@studio/i18n';
import { GlyphFiles } from '../icons/glyphs.js';
import { HAIRLINE, SURFACE } from '../panels/rowGeometry.js';
import { LEFT_PANEL_HEADER } from '../panels/headerGeometry.js';
import { usePathPresence } from './pathMotion.js';
import { breadcrumb, CRUMB_GAP } from './breadcrumb.js';
import { codeRefusalKey } from './refusalCopy.js';
import { TabRow, type CodeTabFacts } from './TabRow.js';

export interface CodePanelProps {
  /** The persistent project title above the path. */
  projectName: string;
  repositoryName?: string;
  tabs: readonly CodeTabFacts[];
  activePath: string | null;
  /** The active tab's refusal; the shell words it, so neither the code area nor the files view carries a second sentence. */
  refusal: CodeRefusalCode | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  /** The open file's code area, or the files view when nothing is open; the shell words the empty state itself. */
  body?: React.ReactNode;
  /** Its own row below the code, so it never covers what is being edited. */
  saveBar?: React.ReactNode;
  /** Below the tab row and above the code: scoped to the active tab, so it never describes a file it is not over. */
  banner?: React.ReactNode;
  /** What the selection maps to and how sure Studio is; absent whenever nothing is selected. */
  tintLabel?: React.ReactNode;
  /** True while the files browser is the body. */
  isBrowsing: boolean;
  /** Opens the browser on its tree through the Files button. */
  onBrowse: () => void;
}

/** The drawn width of the breadcrumb's own box, which the collapse rule spends. */
function useCrumbWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(node);
    setWidth(node.clientWidth);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}

/** The left panel's code view: the path, the open files and whatever the active one shows. Width and accessible name are the frame's, in `App.tsx`. */
export function CodePanel({
  projectName,
  repositoryName = projectName,
  tabs,
  activePath,
  refusal,
  onActivate,
  onClose,
  body,
  saveBar,
  banner,
  tintLabel,
  isBrowsing,
  onBrowse,
}: CodePanelProps): React.JSX.Element {
  const [crumbRef, crumbWidth] = useCrumbWidth();
  const crumbs = activePath === null ? null : breadcrumb(repositoryName, activePath, crumbWidth);
  usePathPresence(crumbRef, !isBrowsing && activePath !== null, `${repositoryName}/${activePath ?? ''}`, crumbWidth);

  return (
    <VStack
      height="100%"
      data-testid="code-panel"
      style={{ flex: '1 1 auto', minWidth: 0, ...SURFACE, borderRight: HAIRLINE, overflow: 'clip' }}
    >
      <VStack
        data-testid="code-panel-header"
        style={{ ...LEFT_PANEL_HEADER, position: 'relative', flexShrink: 0, borderBottom: HAIRLINE }}
      >
        <span data-testid="code-breadcrumb-root" style={{ minWidth: 0, paddingInlineEnd: 28 }}>
          <Text type="body" weight="medium" color="primary" maxLines={1} data-panel-project-name>
            {projectName}
          </Text>
        </span>
        <div
          ref={crumbRef}
          data-testid="code-breadcrumb"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', minHeight: 20, minWidth: 0, overflow: 'hidden' }}
        >
          <Text type="supporting" color="secondary" maxLines={1} style={{ flexShrink: 0 }}>
            {repositoryName || '\u00a0'}
          </Text>
          <HStack data-path-tail align="center" gap={1} style={{ minWidth: 0 }}>
          {!isBrowsing &&
            crumbs?.crumbs.map((crumb, index) => (
            <HStack
              // The path is the key only until the row carries two of one name, which one path cannot.
              key={`${crumb.kind}-${crumb.text}-${String(index)}`}
              align="center"
              gap={1}
              style={{ flexShrink: crumb.kind === 'file' ? 0 : 1, minWidth: 0 }}
            >
              <Text type="supporting" display="block" color="secondary" style={{ opacity: 0.5 }}>
                /
              </Text>
              <span
                {...(crumb.text === CRUMB_GAP ? { title: activePath ?? undefined } : {})}
                style={{ minWidth: 0, overflow: 'hidden' }}
              >
                <Text
                  type="supporting"
                  display="block"
                  color={crumb.kind === 'file' ? 'primary' : 'secondary'}
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {crumb.text}
                </Text>
              </span>
            </HStack>
            ))}
          </HStack>
        </div>
        <HStack align="center" gap={0.5} style={{ position: 'absolute', top: 8, right: 8 }}>
          <IconButton
            variant={isBrowsing ? 'secondary' : 'ghost'}
            size="sm"
            label={t('code.files.browse')}
            tooltip={t('code.files.browse')}
            icon={<GlyphFiles mode="raw" size={14} />}
            aria-pressed={isBrowsing}
            data-testid="code-browse-toggle"
            onClick={onBrowse}
          />
        </HStack>
      </VStack>

      {!isBrowsing && tabs.length > 0 && (
        <TabRow tabs={tabs} activePath={activePath} onActivate={onActivate} onClose={onClose} />
      )}

      {!isBrowsing && tintLabel}

      {!isBrowsing && banner}

      {refusal !== null ? (
        <VStack
          align="center"
          justify="center"
          style={{ flex: '1 1 auto', minHeight: 0, padding: 'var(--spacing-4)' }}
        >
          <Text type="supporting" color="secondary" data-testid="code-panel-refusal" style={{ textAlign: 'center' }}>
            {t(codeRefusalKey(refusal))}
          </Text>
        </VStack>
      ) : body === undefined ? (
        <VStack
          align="center"
          justify="center"
          style={{ flex: '1 1 auto', minHeight: 0, padding: 'var(--spacing-4)' }}
        >
          {/* A blank panel reads as a failure rather than as an empty one. */}
          <Text type="supporting" color="secondary" data-testid="code-panel-empty">
            {t('code.panel.empty')}
          </Text>
        </VStack>
      ) : (
        <VStack style={{ flex: '1 1 auto', minHeight: 0 }}>{body}</VStack>
      )}

      {saveBar}
    </VStack>
  );
}
