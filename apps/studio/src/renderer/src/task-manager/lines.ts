import { TASK_GROUPS, type TaskFrame, type TaskGroup, type TaskManagerSnapshot, type TaskProcess, type TaskRow } from '@studio/events';

export type SortKey = 'cpu' | 'memory' | 'processes';

export interface TaskSort {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

export type TaskLine =
  | { kind: 'heading'; id: string; group: TaskGroup }
  | { kind: 'item'; id: string; group: TaskGroup; row: TaskRow; cpu: number; memory: number; processes: number }
  | { kind: 'frame'; id: string; group: TaskGroup; frame: TaskFrame; isFirst: boolean; isLast: boolean }
  | { kind: 'process'; id: string; group: TaskGroup; process: TaskProcess; cpu: number; memory: number; isFirst: boolean; isLast: boolean };

const measure = (row: TaskRow, key: SortKey): number =>
  key === 'cpu' ? row.cpuPct : key === 'memory' ? row.memoryKb : row.processes.length;

/** Groups in a fixed order, each sorted on its own; a row's Frames always follow it, its processes only when expanded. */
export function taskLines(snapshot: TaskManagerSnapshot | null, sort: TaskSort, isExpanded: boolean): TaskLine[] {
  if (snapshot === null) return [];
  const sign = sort.direction === 'descending' ? -1 : 1;
  return TASK_GROUPS.flatMap((group): TaskLine[] => {
    const rows = snapshot.rows
      .filter((row) => row.group === group)
      .sort((a, b) => sign * (measure(a, sort.key) - measure(b, sort.key)) || a.id.localeCompare(b.id));
    if (rows.length === 0) return [];
    return [
      { kind: 'heading', id: `heading:${group}`, group },
      ...rows.flatMap((row): TaskLine[] => {
        const frames = row.subject.kind === 'frames' ? row.subject.frames : [];
        const processes = isExpanded ? row.processes : [];
        const count = frames.length + processes.length;
        return [
          { kind: 'item', id: row.id, group, row, cpu: row.cpuPct, memory: row.memoryKb, processes: row.processes.length },
          ...frames.map((frame, index): TaskLine => ({ kind: 'frame', id: `${row.id}:frame:${String(index)}`, group, frame, isFirst: index === 0, isLast: index === count - 1 })),
          ...processes.map((process, index): TaskLine => ({ kind: 'process', id: `${row.id}:${String(process.pid)}`, group, process, cpu: process.cpuPct, memory: process.memoryKb, isFirst: frames.length + index === 0, isLast: frames.length + index === count - 1 })),
        ];
      }),
    ];
  });
}
