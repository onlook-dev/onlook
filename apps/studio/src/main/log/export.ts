// Authenticated with the write-only ingestion key events use; a personal or
// project API key would ship in the app (ONL-2347).

export interface ExportRecord {
  ts: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  msg: string;
  attributes: Record<string, string | number | boolean>;
}

export interface LogExportTarget {
  key: string;
  host: string;
}

const SEVERITY: Record<ExportRecord['level'], { text: string; number: number }> = {
  debug: { text: 'DEBUG', number: 5 },
  info: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 },
};

const MAX_PENDING = 500;
const REQUEST_TIMEOUT_MS = 10_000;

function otlpValue(value: string | number | boolean): Record<string, unknown> {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  return { stringValue: value };
}

export function otlpBody(records: readonly ExportRecord[]): unknown {
  return {
    resourceLogs: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'studio-desktop' } }] },
        scopeLogs: [
          {
            scope: { name: 'studio' },
            logRecords: records.map((record) => ({
              timeUnixNano: `${String(record.ts)}000000`,
              severityText: SEVERITY[record.level].text,
              severityNumber: SEVERITY[record.level].number,
              body: { stringValue: record.msg },
              attributes: Object.entries(record.attributes).map(([key, value]) => ({ key, value: otlpValue(value) })),
            })),
          },
        ],
      },
    ],
  };
}

export interface LogExporter {
  configure(target: LogExportTarget | undefined): void;
  push(record: ExportRecord): void;
  flush(): Promise<void>;
  dispose(): void;
}

// `onDropped` fires on a change of status; a line it pushes joins the next batch and every batch after.
export function createLogExporter(options: {
  intervalMs: number;
  fetch?: typeof fetch;
  onDropped?: (status: number, count: number) => void;
}): LogExporter {
  let target: LogExportTarget | undefined;
  let pending: ExportRecord[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight: Promise<void> | undefined;
  let reportedStatus: number | undefined;
  let aborter = new AbortController();
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  const send = async (): Promise<void> => {
    if (target === undefined || pending.length === 0) return;
    const batch = pending;
    pending = [];
    try {
      const response = await doFetch(`${target.host}/i/v1/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.key}` },
        body: JSON.stringify(otlpBody(batch)),
        signal: AbortSignal.any([aborter.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      });
      if (response.ok) {
        reportedStatus = undefined;
        return;
      }
      if (response.status !== reportedStatus) {
        reportedStatus = response.status;
        options.onDropped?.(response.status, batch.length);
      }
    } catch {
      // Dropped without retry; the file has the lines.
    }
  };

  // One request in flight; a skipped tick's records stay pending for the next.
  const flush = async (): Promise<void> => {
    if (inFlight !== undefined) return inFlight;
    inFlight = send().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };

  return {
    configure(next) {
      target = next;
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      if (next === undefined) {
        aborter.abort();
        aborter = new AbortController();
        pending = [];
        return;
      }
      timer = setInterval(() => void flush(), options.intervalMs);
      timer.unref?.();
    },
    push(record) {
      if (target === undefined) return;
      pending.push(record);
      if (pending.length > MAX_PENDING) pending.splice(0, pending.length - MAX_PENDING);
    },
    flush,
    dispose() {
      aborter.abort();
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      target = undefined;
      pending = [];
    },
  };
}
