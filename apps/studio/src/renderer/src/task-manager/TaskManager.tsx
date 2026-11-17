import { useMemo } from 'react';
import type { IconType } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Switch } from '@astryxdesign/core/Switch';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Table, TableCell, pixel, proportional, useTableSortable, type TableColumn, type TablePlugin } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TASK_MANAGER_HEADER_HEIGHT, TASK_MANAGER_TRAFFIC_LIGHTS, type StudioPart, type TaskGroup, type TaskManagerSnapshot, type TaskRow, type WindowControlsEdge } from '@studio/events';

import { intlLocale, t, type StringKey } from '@studio/i18n';
import { ChipGlyph, ClaudeMarkIcon, FolderIcon, OpenAiMarkIcon, ProjectsIcon, ReloadIcon, ServerGlyph, WindowGlyph } from '../icons/glyphs.js';
import './task-manager.css';
import { taskLines, type SortKey, type TaskLine, type TaskSort } from './lines.js';

export interface TaskManagerProps {
  snapshot: TaskManagerSnapshot | null;
  sort: TaskSort;
  isExpanded: boolean;
  onSortChange: (sort: TaskSort) => void;
  onExpandedChange: (isExpanded: boolean) => void;
  onRefresh: () => void;
  onShowTab: (tabId: string) => void;
  windowControls: WindowControlsEdge;
}

/** Every body row the same height, so sub-items and their elbows sit on one rhythm. */
const ROW_HEIGHT = 28;
/** An inline line box in a cell adds half a pixel to its row; a block one does not. */
const BLOCK: React.CSSProperties = { display: 'block' };
const TRAFFIC_LIGHTS_END = `${TASK_MANAGER_TRAFFIC_LIGHTS.x + 72 + 20}px`;
/** The overlay's own rect where the window reports it; 136px is the caption buttons' measured width (ONL-3112). */
const CAPTION_BUTTONS_END = 'calc(var(--spacing-4) + 100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, calc(100vw - 136px)))';
const HEADER_INSET: Record<WindowControlsEdge, React.CSSProperties> = {
  leading: { paddingInlineStart: TRAFFIC_LIGHTS_END },
  trailing: { paddingInlineEnd: CAPTION_BUTTONS_END },
  none: {},
};
const DRAG = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const FACT: React.CSSProperties = { marginInlineEnd: 'var(--spacing-2)' };
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

const GROUP_LABEL: Record<TaskGroup, StringKey> = {
  tabs: 'taskManager.group.tabs',
  frames: 'taskManager.group.frames',
  agent: 'taskManager.group.agent',
  dev_servers: 'taskManager.group.devServers',
  studio: 'taskManager.group.app',
};

const PART_LABEL: Record<StudioPart, StringKey> = {
  main: 'taskManager.part.main',
  gpu: 'taskManager.part.gpu',
  band: 'taskManager.part.band',
  utility: 'taskManager.part.utility',
  spare_tab: 'taskManager.part.spareTab',
  task_manager: 'taskManager.part.taskManager',
  other: 'taskManager.part.other',
};

function formatCpu(pct: number): string {
  return new Intl.NumberFormat(intlLocale(), { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(pct / 100);
}

function formatMemory(kb: number): string {
  if (kb === 0) return new Intl.NumberFormat(intlLocale(), { style: 'unit', unit: 'kilobyte', unitDisplay: 'short' }).format(0);
  const [value, unit] = kb >= 1024 * 1024 ? [kb / (1024 * 1024), 'gigabyte'] : kb >= 1024 ? [kb / 1024, 'megabyte'] : [kb, 'kilobyte'];
  return new Intl.NumberFormat(intlLocale(), { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: unit === 'gigabyte' ? 1 : 0, minimumFractionDigits: unit === 'gigabyte' ? 1 : 0 }).format(value);
}

function formatCount(count: number): string {
  return new Intl.NumberFormat(intlLocale()).format(count);
}

function rowName(row: TaskRow): string {
  const subject = row.subject;
  switch (subject.kind) {
    case 'tab': return subject.name;
    case 'frames': return subject.projectName ?? t('taskManager.frames.name');
    case 'harness': return t(subject.harness === 'claude' ? 'taskManager.harness.claude' : 'taskManager.harness.codex');
    case 'dev_server': return subject.projectName ?? t('taskManager.devServer.name');
    case 'studio': return t(PART_LABEL[subject.part]);
  }
}

/** Separate facts, each its own element, never one sentence. */
function rowFacts(row: TaskRow): string[] {
  const subject = row.subject;
  const facts: string[] = [];
  if (subject.kind === 'dev_server' && subject.port !== undefined) facts.push(t('taskManager.devServer.port', { port: String(subject.port) }));
  return facts;
}

function rowIcon(row: TaskRow): IconType {
  const subject = row.subject;
  switch (subject.kind) {
    case 'tab': return subject.purpose === 'projects' ? ProjectsIcon : FolderIcon;
    case 'frames': return WindowGlyph;
    case 'harness': return subject.harness === 'claude' ? ClaudeMarkIcon : OpenAiMarkIcon;
    case 'dev_server': return ServerGlyph;
    case 'studio': return ChipGlyph;
  }
}

function tabOf(row: TaskRow): string | undefined {
  const subject = row.subject;
  return subject.kind === 'harness' || subject.kind === 'studio' ? undefined : subject.tabId;
}

const ELBOW_X = 'calc(var(--icon-size-sm, 16px) / 2)';
const CELL_PAD_OUT = 'calc(-1 * var(--spacing-1))';
const ELBOW_REACH = 'calc(-2 * var(--spacing-1))';
const ELBOW_LINE = 'var(--border-width) solid var(--color-border-emphasized)';

function SubItem({ isFirst, isLast, children }: { isFirst: boolean; isLast: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <HStack gap={2} data-testid="task-manager-subitem" style={{ position: 'relative', paddingInlineStart: 'var(--spacing-6)', minWidth: 0, alignItems: 'baseline' }}>
      <span aria-hidden data-testid="task-manager-elbow" style={{ position: 'absolute', insetInlineStart: ELBOW_X, top: isFirst ? ELBOW_REACH : CELL_PAD_OUT, bottom: isLast ? '50%' : CELL_PAD_OUT, borderInlineStart: ELBOW_LINE, transform: 'translateX(-50%)' }} />
      <span aria-hidden style={{ position: 'absolute', insetInlineStart: ELBOW_X, top: '50%', width: 'calc(var(--spacing-6) - var(--spacing-1) - ' + ELBOW_X + ')', borderBlockStart: ELBOW_LINE }} />
      {children}
    </HStack>
  );
}

const STACKED: React.CSSProperties = { gridArea: '1 / 1' };
const SIZER: React.CSSProperties = { ...STACKED, visibility: 'hidden' };

function Stat({ label, value, widest }: { label: string; value: string; widest: readonly string[] }): React.JSX.Element {
  return (
    <VStack align="start" gap={0.5} style={SHARED_COLUMN}>
      <Text type="supporting" color="secondary" maxLines={1}>{label}</Text>
      <div style={{ display: 'grid' }}>
        <Text type="label" hasTabularNumbers maxLines={1} style={STACKED}>{value}</Text>
        {widest.map((sample) => <Text key={sample} type="label" hasTabularNumbers maxLines={1} aria-hidden style={SIZER}>{sample}</Text>)}
      </div>
    </VStack>
  );
}

function widestValues(): { cpu: string[]; memory: string[] } {
  return {
    cpu: [formatCpu(888.8), t('taskManager.measuring')],
    memory: [formatMemory(1023.9 * 1024), formatMemory(888.8 * 1024 * 1024)],
  };
}

const TOTALS: React.CSSProperties = { flexWrap: 'wrap', columnGap: 'var(--spacing-6)', rowGap: 'var(--spacing-3)' };
const SHARED_COLUMN: React.CSSProperties = { flex: '1 1 0', minWidth: 'max-content' };

function Totals({ snapshot }: { snapshot: TaskManagerSnapshot | null }): React.JSX.Element {
  const totals = snapshot?.totals;
  const blank = '—';
  const widest = useMemo(widestValues, []);
  return (
    <HStack paddingInline={4} paddingBlock={3} data-testid="task-manager-totals" style={TOTALS}>
      <Stat label={t('taskManager.total.cpu')} widest={widest.cpu} value={totals === undefined ? blank : snapshot?.isCpuPending === true ? t('taskManager.measuring') : formatCpu(totals.cpuPct)} />
      <Stat label={t('taskManager.total.memory')} widest={widest.memory} value={totals === undefined ? blank : formatMemory(totals.memoryKb)} />
      {snapshot?.isElectronOnly === true ? null : (
        <>
          <Stat label={t('taskManager.total.app')} widest={widest.memory} value={totals === undefined ? blank : formatMemory(totals.studioKb)} />
          <Stat label={t('taskManager.total.children')} widest={widest.memory} value={totals === undefined ? blank : formatMemory(totals.childKb)} />
        </>
      )}
    </HStack>
  );
}

export function TaskManager({ snapshot, sort, isExpanded, onSortChange, onExpandedChange, onRefresh, onShowTab, windowControls }: TaskManagerProps): React.JSX.Element {
  const lines = useMemo(() => taskLines(snapshot, sort, isExpanded), [snapshot, sort, isExpanded]);
  const isCpuPending = snapshot?.isCpuPending === true;

  const sortable = useTableSortable<TaskLine, SortKey>({
    sort: [{ sortKey: sort.key, direction: sort.direction }],
    allowUnsortedState: false,
    onSortChange: (next) => {
      const entry = next[0];
      if (entry === undefined) return;
      onSortChange({ key: entry.sortKey, direction: entry.sortKey === sort.key ? entry.direction : 'descending' });
    },
  });

  const rows = useMemo<TablePlugin<TaskLine>>(() => ({
    transformHeaderCell(props, column) {
      return column.align === 'end' ? { ...props, htmlProps: { ...props.htmlProps, 'data-align': 'end' } } : props;
    },
    transformBodyRow(props, line) {
      if (line.kind === 'heading') {
        return {
          ...props,
          htmlProps: { ...props.htmlProps, style: { backgroundColor: 'transparent', height: ROW_HEIGHT } },
          children: (
            <TableCell colSpan={4}>
              <Text type="supporting" color="secondary" weight="medium" style={BLOCK}>{t(GROUP_LABEL[line.group])}</Text>
            </TableCell>
          ),
        };
      }
      const tabId = line.kind === 'item' ? tabOf(line.row) : undefined;
      if (tabId === undefined) return { ...props, htmlProps: { ...props.htmlProps, style: { backgroundColor: 'transparent', height: ROW_HEIGHT } } };
      const show = (): void => onShowTab(tabId);
      return {
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: 0,
          'data-testid': 'task-manager-row',
          onClick: show,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            show();
          },
          style: { cursor: 'pointer', height: ROW_HEIGHT },
        },
      };
    },
  }), [onShowTab]);

  const columns = useMemo<TableColumn<TaskLine>[]>(() => [
    {
      key: 'name',
      header: t('taskManager.column.name'),
      width: proportional(1),
      renderCell: (line) => {
        if (line.kind === 'heading') return null;
        if (line.kind === 'frame') {
          return (
            <SubItem isFirst={line.isFirst} isLast={line.isLast}>
              <Text type="supporting" color="secondary" maxLines={1}>{line.frame.page ?? t('taskManager.frame.artifact')}</Text>
            </SubItem>
          );
        }
        if (line.kind === 'process') {
          return (
            <SubItem isFirst={line.isFirst} isLast={line.isLast}>
              <Text type="supporting" color="secondary" maxLines={1}>{line.process.name}</Text>
              <Text type="supporting" color="secondary" hasTabularNumbers style={{ flexShrink: 0 }}>{t('taskManager.process.pid', { pid: String(line.process.pid) })}</Text>
            </SubItem>
          );
        }
        const facts = rowFacts(line.row);
        return (
          <HStack gap={2} align="center" style={{ minWidth: 0 }}>
            <Icon icon={rowIcon(line.row)} size="sm" color="secondary" />
            <HStack gap={2} style={{ minWidth: 0, alignItems: 'baseline' }}>
              <Text type="body" maxLines={1} style={{ flexShrink: 0, maxWidth: '100%' }}>{rowName(line.row)}</Text>
              {facts.length > 0 ? (
                <Text type="supporting" color="secondary" maxLines={1} data-testid="task-manager-facts" style={{ flex: '0 1 auto', minWidth: '3em' }}>
                  {facts.map((fact) => <span key={fact} style={FACT}>{fact}</span>)}
                </Text>
              ) : null}
            </HStack>
          </HStack>
        );
      },
    },
    {
      key: 'cpu',
      header: t('taskManager.column.cpu'),
      width: pixel(96),
      align: 'end',
      sortable: true,
      renderCell: (line) => line.kind === 'heading' || line.kind === 'frame' ? null : (
        <Text type={line.kind === 'process' ? 'supporting' : 'body'} color={line.kind === 'process' ? 'secondary' : undefined} hasTabularNumbers style={BLOCK}>{isCpuPending ? '—' : formatCpu(line.cpu)}</Text>
      ),
    },
    {
      key: 'memory',
      header: t('taskManager.column.memory'),
      width: pixel(104),
      align: 'end',
      sortable: true,
      renderCell: (line) => line.kind === 'heading' || line.kind === 'frame' ? null : (
        <Text type={line.kind === 'process' ? 'supporting' : 'body'} color={line.kind === 'process' ? 'secondary' : undefined} hasTabularNumbers style={BLOCK}>{formatMemory(line.memory)}</Text>
      ),
    },
    {
      key: 'processes',
      header: t('taskManager.column.processes'),
      width: pixel(96),
      align: 'end',
      sortable: true,
      renderCell: (line) => line.kind === 'item' ? <Text type="body" hasTabularNumbers style={BLOCK}>{formatCount(line.processes)}</Text> : null,
    },
  ], [isCpuPending]);

  const refreshIcon = useMemo(() => <Icon icon={ReloadIcon} size="sm" color="inherit" />, []);

  return (
    <VStack height="100%" data-testid="task-manager">
      <HStack
        align="center"
        justify="between"
        gap={3}
        paddingInline={4}
        style={{ ...DRAG, height: TASK_MANAGER_HEADER_HEIGHT, flexShrink: 0, ...HEADER_INSET[windowControls] }}
      >
        <Text type="large" maxLines={1}>{t('taskManager.title')}</Text>
        <HStack gap={3} align="center" style={{ ...NO_DRAG, flexShrink: 0 }}>
          <Switch label={t('taskManager.processes')} value={isExpanded} onChange={onExpandedChange} />
          <IconButton label={t('taskManager.refresh')} icon={refreshIcon} variant="ghost" size="sm" onClick={onRefresh} data-testid="task-manager-refresh" />
        </HStack>
      </HStack>
      <Divider />
      <Totals snapshot={snapshot} />
      <Divider />
      <VStack paddingInline={2} style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
        <Table<TaskLine>
          data={lines}
          columns={columns}
          idKey="id"
          plugins={{ sortable, rows }}
          density="compact"
          dividers="none"
          hasHover
          textOverflow="truncate"
          emptyState={false}
        />
        {snapshot === null ? (
          <VStack align="center" justify="center" style={{ flex: '1 1 auto' }}>
            <Text type="supporting" color="secondary">{t('taskManager.measuring')}</Text>
          </VStack>
        ) : null}
      </VStack>
    </VStack>
  );
}
