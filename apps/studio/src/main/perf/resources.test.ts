import { describe, expect, it } from 'bun:test';
import {
  classifyDescendants,
  classifyElectron,
  parsePs,
  parsePsTime,
  ramBucket,
  summarizeResources,
  type Classified,
} from './resources.js';

const MAIN = 100;

const PS = `
  100     1  200000   1:02.50 /Applications/Onlook.app/Contents/MacOS/Onlook
  101   100   90000   0:10.00 /Applications/Onlook.app/Contents/Frameworks/Onlook Helper (Renderer).app/Contents/MacOS/Onlook Helper (Renderer)
  102   100   40960   0:03.00 /Applications/Onlook.app/Contents/Frameworks/Onlook Helper.app/Contents/MacOS/Onlook Helper
  110   100   51200   0:30.00 /Users/someone/app/node_modules/@anthropic-ai/claude-agent-sdk-darwin-arm64/claude
  111   110   10240   0:01.00 /usr/local/bin/node
  120   100   20480   0:02.00 /Users/someone/.codex/bin/codex
  130   100    4096   0:00.50 /bin/zsh
  131   130    8192 1-00:00:01 /usr/bin/vim
  140   102   30720   0:05.00 /bin/sh
  141   140  102400   0:40.00 /usr/local/bin/bun
  150   100    2048   0:00.10 /usr/bin/git
  900     1    9999   0:01.00 /usr/bin/unrelated
`;

describe('reading ps', () => {
  it('parses each column and keeps only the executable’s basename', () => {
    const rows = parsePs(PS);
    expect(rows).toHaveLength(12);
    expect(rows.find((row) => row.pid === 110)).toEqual({ pid: 110, ppid: 100, residentKb: 51200, cpuSeconds: 30, exe: 'claude' });
    expect(rows[1]?.exe).toBe('Onlook Helper (Renderer)');
  });

  it('reads days, hours and minutes in the CPU time', () => {
    expect(parsePsTime('0:01.50')).toBe(1.5);
    expect(parsePsTime('1:02:03')).toBe(3723);
    expect(parsePsTime('1-00:00:01')).toBe(86_401);
  });
});

describe('labelling main’s descendants', () => {
  it('labels each by the nearest ancestor that says what it is, and skips Electron’s own and strangers', () => {
    const labelled = classifyDescendants(parsePs(PS), MAIN, new Set([101, 102]), new Set([102]));
    expect(Object.fromEntries(labelled.map((row) => [row.pid, row.processClass]))).toEqual({
      110: 'claude_cli',
      111: 'claude_cli',
      120: 'codex',
      130: 'terminal',
      131: 'terminal',
      140: 'dev_server',
      141: 'dev_server',
      150: 'other',
    });
  });

  it('labels Electron’s processes by type, the views by what they show, and the starter as the dev server', () => {
    const classes = classifyElectron(
      [
        { pid: 100, type: 'Browser', residentKb: 1, cpuSeconds: 1 },
        { pid: 101, type: 'Tab', residentKb: 1, cpuSeconds: 1 },
        { pid: 103, type: 'Tab', residentKb: 1, cpuSeconds: 1 },
        { pid: 104, type: 'Tab', residentKb: 1, cpuSeconds: 1 },
        { pid: 105, type: 'GPU', residentKb: 1, cpuSeconds: 1 },
        { pid: 102, type: 'Utility', serviceName: 'studio-starter:abc', residentKb: 1, cpuSeconds: 1 },
        { pid: 106, type: 'Utility', serviceName: 'network.mojom.NetworkService', residentKb: 1, cpuSeconds: 1 },
      ],
      [
        { pid: 101, kind: 'band' },
        { pid: 103, kind: 'tab' },
        { pid: 104, kind: 'frame', hostPid: 103 },
      ],
    ).map((process) => process.processClass);
    expect(classes).toEqual(['browser', 'band', 'tab', 'frame', 'gpu', 'dev_server', 'utility']);
  });
});

describe('the resource summary', () => {
  const context = {
    windowMs: 10_000,
    openTabs: 2,
    webviews: 2,
    uptimeMin: 12.4,
    onBattery: false,
    thermalState: 'nominal' as const,
    displayHz: 120,
    ramBucket: 'lte_16' as const,
    instrumentMs: 1.2,
  };

  it('averages CPU over the window from cumulative time, counting a newborn process from zero', () => {
    const processes: Classified[] = [
      { pid: 1, processClass: 'gpu', residentKb: 2048, cpuSeconds: 15 },
      { pid: 2, processClass: 'claude_cli', residentKb: 1024, cpuSeconds: 2 },
    ];
    const summary = summarizeResources(processes, [], new Map([[1, 10]]), context);
    expect(summary).toMatchObject({ gpu_cpu_pct: 50, gpu_mb: 2, claude_cli_cpu_pct: 20, claude_cli_count: 1, total_cpu_pct: 70, total_mb: 3 });
  });

  it('costs a tab as its own process plus its frames’ processes, each counted once', () => {
    const processes: Classified[] = [
      { pid: 10, processClass: 'tab', residentKb: 100 * 1024, cpuSeconds: 0 },
      { pid: 11, processClass: 'frame', residentKb: 50 * 1024, cpuSeconds: 0 },
      { pid: 20, processClass: 'tab', residentKb: 40 * 1024, cpuSeconds: 0 },
    ];
    const views = [
      { pid: 10, kind: 'tab' as const },
      { pid: 11, kind: 'frame' as const, hostPid: 10 },
      { pid: 11, kind: 'frame' as const, hostPid: 10 },
      { pid: 20, kind: 'tab' as const },
    ];
    expect(summarizeResources(processes, views, new Map(), context)).toMatchObject({ tab_mb_max: 150, tab_mb_median: 40 });
  });

  it('buckets the machine’s memory', () => {
    expect(ramBucket(16 * 1024 ** 3)).toBe('lte_16');
    expect(ramBucket(18 * 1024 ** 3)).toBe('lte_32');
    expect(ramBucket(128 * 1024 ** 3)).toBe('gt_64');
  });
});
