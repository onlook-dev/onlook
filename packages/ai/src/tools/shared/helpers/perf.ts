/**
 * Performance measurement and blocking detection utilities
 */

interface PerfResult<T> {
    result: T;
    duration: number;
    wasBlocking?: boolean;
}

interface PerfLogEntry {
    label: string;
    duration: number;
    isBlocking?: boolean;
    children?: PerfLogEntry[];
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
    label: string,
    fn: () => Promise<T>,
    detectBlocking = true
): Promise<PerfResult<T>> {
    const start = performance.now();

    // Try to detect if we're blocking by checking if we can yield
    let wasBlocking = false;
    if (detectBlocking && typeof scheduler !== 'undefined' && 'yield' in scheduler) {
        const yieldStart = performance.now();
        try {
            await (scheduler as any).yield();
            const yieldTime = performance.now() - yieldStart;
            // If yielding takes > 50ms, we were likely blocking
            wasBlocking = yieldTime > 50;
        } catch {
            // scheduler.yield not available, skip blocking detection
        }
    }

    const result = await fn();
    const duration = performance.now() - start;

    return { result, duration, wasBlocking };
}

/**
 * Measure synchronous operation performance
 */
export function measureSync<T>(label: string, fn: () => T): PerfResult<T> {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    // Sync operations that take > 50ms are definitely blocking
    const wasBlocking = duration > 50;

    return { result, duration, wasBlocking };
}

/**
 * Log performance results in a structured format
 */
export function perfLog(label: string, duration: number, isBlocking?: boolean, indent = 0): void {
    const prefix = '  '.repeat(indent) + (indent > 0 ? '├─ ' : '[PERF] ');
    const blockingIndicator = isBlocking ? ' (BLOCKING ⚠️)' : '';
    const asyncIndicator = !isBlocking && duration > 10 ? ' (async ✓)' : '';

    console.log(`${prefix}${label}: ${duration.toFixed(0)}ms${blockingIndicator}${asyncIndicator}`);
}

/**
 * Create a performance context for hierarchical logging
 */
export class PerfContext {
    private entries: PerfLogEntry[] = [];
    private stack: PerfLogEntry[][] = [this.entries];

    async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        const { result, duration, wasBlocking } = await measureAsync(label, fn);
        this.addEntry({ label, duration, isBlocking: wasBlocking });
        return result;
    }

    measureSync<T>(label: string, fn: () => T): T {
        const { result, duration, wasBlocking } = measureSync(label, fn);
        this.addEntry({ label, duration, isBlocking: wasBlocking });
        return result;
    }

    startGroup(label: string): void {
        const entry: PerfLogEntry = { label, duration: 0, children: [] };
        this.addEntry(entry);
        this.stack.push(entry.children!);
    }

    endGroup(): void {
        if (this.stack.length > 1) {
            this.stack.pop();
        }
    }

    private addEntry(entry: PerfLogEntry): void {
        const current = this.stack[this.stack.length - 1];
        if (current) {
            current.push(entry);
        }
    }

    log(rootLabel?: string): void {
        if (rootLabel) {
            console.log(`[PERF] ${rootLabel}`);
        }
        this.logEntries(this.entries, rootLabel ? 1 : 0);
    }

    private logEntries(entries: PerfLogEntry[], indent: number): void {
        for (const entry of entries) {
            perfLog(entry.label, entry.duration, entry.isBlocking, indent);
            if (entry.children && entry.children.length > 0) {
                this.logEntries(entry.children, indent + 1);
            }
        }
    }
}
