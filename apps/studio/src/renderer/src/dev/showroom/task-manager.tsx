import { useState } from 'react';
import { TASK_MANAGER_HEADER_HEIGHT, TASK_MANAGER_TRAFFIC_LIGHTS, type TaskManagerSnapshot, type TaskProcess, type TaskRow, type WindowControlsEdge } from '@studio/events';

import { TaskManager } from '../../task-manager/TaskManager.js';
import type { TaskSort } from '../../task-manager/lines.js';
import { noop, type Category, type Gallery, type Story } from './Showroom.js';

const MB = 1024;

function processes(base: number, names: string[], cpuPct: number, memoryKb: number): TaskProcess[] {
  return names.map((name, index) => ({ pid: base + index, name, cpuPct: index === 0 ? cpuPct : 0.1, memoryKb: index === 0 ? memoryKb : 24 * MB }));
}

function row(id: string, group: TaskRow['group'], subject: TaskRow['subject'], list: TaskProcess[]): TaskRow {
  return {
    id,
    group,
    subject,
    processes: list,
    cpuPct: list.reduce((total, process) => total + process.cpuPct, 0),
    memoryKb: list.reduce((total, process) => total + process.memoryKb, 0),
  };
}

const ROWS: TaskRow[] = [
  row('tab:a', 'tabs', { kind: 'tab', tabId: 'a', name: 'Checkout redesign', purpose: 'project' }, processes(41010, ['Renderer'], 6.2, 412 * MB)),
  row('tab:b', 'tabs', { kind: 'tab', tabId: 'b', name: 'Pricing page', purpose: 'project' }, processes(41020, ['Renderer'], 0.4, 288 * MB)),
  row('tab:p', 'tabs', { kind: 'tab', tabId: 'p', name: 'Projects', purpose: 'projects' }, processes(41030, ['Renderer'], 0, 96 * MB)),
  row('frames:a', 'frames', { kind: 'frames', tabId: 'a', projectName: 'Checkout redesign', addresses: ['localhost:3000'], frameCount: 4, artifactCount: 1, frames: [{ pid: 41100, isArtifact: false, page: 'localhost:3000/checkout' }, { pid: 41100, isArtifact: false, page: 'localhost:3000/checkout/payment' }, { pid: 41101, isArtifact: false, page: 'localhost:3000/cart' }, { pid: 41101, isArtifact: false, page: 'localhost:3000' }, { pid: 41101, isArtifact: true }] }, processes(41100, ['Renderer', 'Renderer'], 38.5, 640 * MB)),
  row('frames:b', 'frames', { kind: 'frames', tabId: 'b', projectName: 'Pricing page', addresses: ['localhost:5173'], frameCount: 2, artifactCount: 0, frames: [{ pid: 41200, isArtifact: false, page: 'localhost:5173/pricing' }, { pid: 41200, isArtifact: false, page: 'localhost:5173/pricing/enterprise' }] }, processes(41200, ['Renderer'], 2.1, 210 * MB)),
  row('harness:claude', 'agent', { kind: 'harness', harness: 'claude' }, processes(42000, ['claude', 'zsh', 'rg'], 24.8, 380 * MB)),
  row('dev:/w/checkout:3000', 'dev_servers', { kind: 'dev_server', tabId: 'a', projectName: 'Checkout redesign', port: 3000 }, processes(43000, ['node', 'next-server', 'node'], 61.3, 1.4 * 1024 * MB)),
  row('dev:/w/pricing:5173', 'dev_servers', { kind: 'dev_server', tabId: 'b', projectName: 'Pricing page', port: 5173 }, processes(43100, ['node', 'esbuild'], 0.8, 190 * MB)),
  row('studio:main', 'studio', { kind: 'studio', part: 'main' }, processes(40000, ['Main'], 3.4, 260 * MB)),
  row('studio:gpu', 'studio', { kind: 'studio', part: 'gpu' }, processes(40001, ['GPU'], 9.7, 330 * MB)),
  row('studio:utility', 'studio', { kind: 'studio', part: 'utility' }, processes(40002, ['Network Service', 'Storage Service'], 0.6, 48 * MB)),
  row('studio:band', 'studio', { kind: 'studio', part: 'band' }, processes(40003, ['Renderer'], 0.2, 82 * MB)),
  row('studio:spare_tab', 'studio', { kind: 'studio', part: 'spare_tab' }, processes(40004, ['Renderer'], 0, 74 * MB)),
  row('studio:task_manager', 'studio', { kind: 'studio', part: 'task_manager' }, processes(40005, ['Renderer'], 0.9, 70 * MB)),
];

function snapshot(over: Partial<TaskManagerSnapshot> = {}): TaskManagerSnapshot {
  const rows = over.rows ?? ROWS;
  const memoryKb = rows.reduce((total, candidate) => total + candidate.memoryKb, 0);
  const childKb = rows.filter((candidate) => ['agent', 'dev_servers'].includes(candidate.group)).reduce((total, candidate) => total + candidate.memoryKb, 0);
  return {
    totals: {
      cpuPct: rows.reduce((total, candidate) => total + candidate.cpuPct, 0),
      memoryKb,
      studioKb: memoryKb - childKb,
      childKb,
    },
    rows,
    ...over,
  };
}

/** A grey stand-in for macOS's lights; the lab cannot draw the real ones. */
function MockTrafficLights(): React.JSX.Element {
  return (
    <div aria-hidden data-mock="traffic-lights" style={{ position: 'absolute', top: TASK_MANAGER_TRAFFIC_LIGHTS.y, left: TASK_MANAGER_TRAFFIC_LIGHTS.x, display: 'flex', gap: 8 }}>
      {[0, 1, 2].map((index) => <div key={index} style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-border)' }} />)}
    </div>
  );
}

/** A grey stand-in for Windows' caption buttons over the header; the lab has no overlay, so the header reserves their measured width. */
function MockCaptionButtons(): React.JSX.Element {
  return (
    <div aria-hidden data-mock="caption-buttons" style={{ position: 'absolute', top: 0, right: 0, width: 136, height: TASK_MANAGER_HEADER_HEIGHT, display: 'flex' }}>
      {[0, 1, 2].map((index) => <div key={index} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 10, height: 10, border: 'var(--border-width) solid var(--color-border)' }} /></div>)}
    </div>
  );
}

interface WindowProps {
  value: TaskManagerSnapshot | null;
  expanded?: boolean;
  initialSort?: TaskSort;
  controls?: WindowControlsEdge;
  width?: number;
  height?: number;
}

function Window({ value, expanded = false, initialSort = { key: 'cpu', direction: 'descending' }, controls = 'none', width = 720, height = 620 }: WindowProps): React.JSX.Element {
  const [sort, setSort] = useState<TaskSort>(initialSort);
  const [isExpanded, setIsExpanded] = useState(expanded);
  return (
    <div style={{ position: 'relative', width, height, background: 'var(--studio-ground)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-element)', overflow: 'hidden' }}>
      <TaskManager snapshot={value} sort={sort} isExpanded={isExpanded} onSortChange={setSort} onExpandedChange={setIsExpanded} onRefresh={noop} onShowTab={noop} windowControls={controls} />
      {controls === 'leading' ? <MockTrafficLights /> : null}
      {controls === 'trailing' ? <MockCaptionButtons /> : null}
    </div>
  );
}

const EDGE_ROWS: TaskRow[] = [
  row('tab:long', 'tabs', { kind: 'tab', tabId: 'l', name: 'Marketing site redesign for the autumn launch with the new pricing tiers', purpose: 'project' }, processes(98765, ['Renderer'], 0, 0)),
  row('frames:long', 'frames', { kind: 'frames', tabId: 'l', projectName: 'Marketing site redesign for the autumn launch with the new pricing tiers', addresses: ['localhost:3000', 'localhost:3001', '127.0.0.1:5173', 'staging.example.dev'], frameCount: 12, artifactCount: 3, frames: [{ pid: 99990, isArtifact: false, page: 'localhost:3000/marketing/autumn-launch/pricing-tiers-comparison-table' }, { pid: 99991, isArtifact: false, page: 'staging.example.dev/autumn' }, { pid: 99992, isArtifact: true }] }, processes(99990, ['Renderer', 'Renderer', 'Renderer'], 184.6, 3.7 * 1024 * MB)),
  row('dev:/w/long:3000', 'dev_servers', { kind: 'dev_server', tabId: 'l', projectName: 'Marketing site redesign for the autumn launch with the new pricing tiers', port: 3000 }, processes(99001, ['node', 'next-server'], 312.4, 11.2 * 1024 * MB)),
  row('studio:main', 'studio', { kind: 'studio', part: 'main' }, processes(40000, ['Main'], 3.4, 260 * MB)),
];

function story(id: string, title: string, note: string, render: () => React.ReactNode): Story {
  return { id: `task-manager-${id}`, title, note, render };
}

const CATEGORIES: Category[] = [
  {
    id: 'window',
    title: 'Window → Task Manager… (ONL-3112)',
    stories: [
      story('mac', 'macOS, lights inset in the header (grey lights are a mock)', 'hiddenInset title bar; the header is the drag region', () => <Window value={snapshot()} controls="leading" />),
      story('edge', 'Long names, many addresses, 0 B, multi-GB, CPU over 100%', 'five-digit PIDs; processes on', () => <Window value={snapshot({ rows: EDGE_ROWS })} expanded controls="leading" />),
      story('minimum', 'The window at its 480×360 minimum', 'macOS', () => <Window value={snapshot()} controls="leading" width={480} height={360} />),
      story('ascending', 'Sorted by Memory, ascending', 'a second press on a sorted column', () => <Window value={snapshot()} initialSort={{ key: 'memory', direction: 'ascending' }} />),
      story('busy', 'Two Projects, one agent turn running', 'sorted by CPU; press a Tab, Frame or dev server row to bring its Tab forward', () => <Window value={snapshot()} />),
      story('processes', 'Processes on', 'each row’s own processes under it', () => <Window value={snapshot()} expanded />),
      story('first', 'The first reading', 'CPU needs a second reading to measure against', () => <Window value={snapshot({ isCpuPending: true })} />),
      story('electron-only', 'Windows, caption buttons over the header (grey buttons are a mock)', 'no process list there, so only the app’s own processes', () => (
        <Window value={snapshot({ isElectronOnly: true, rows: ROWS.filter((candidate) => ['tabs', 'frames', 'studio'].includes(candidate.group)) })} controls="trailing" />
      )),
      story('empty', 'Before the first reading', 'the window opens before main has answered', () => <Window value={null} />),
    ],
  },
];

export const TASK_MANAGER_GALLERY: Gallery = {
  id: 'task-manager',
  title: 'Task Manager',
  subtitle: 'What each Tab, Frame, agent and dev server is using.',
  categories: CATEGORIES,
};
