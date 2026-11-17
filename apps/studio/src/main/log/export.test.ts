import { expect, test } from 'bun:test';
import { createLogExporter } from './export.js';

test('disabling remote logs aborts the request, clears pending records, and permits a fresh opt-in', async () => {
  const signals: AbortSignal[] = [];
  const bodies: string[] = [];
  const exporter = createLogExporter({
    intervalMs: 60_000,
    fetch: ((_url: unknown, options: RequestInit) => {
      signals.push(options.signal as AbortSignal);
      bodies.push(String(options.body));
      if (bodies.length > 1) return Promise.resolve(new Response('ok'));
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }) as typeof fetch,
  });
  const target = { key: 'phc_test', host: 'https://collector.invalid' };
  const record = (msg: string) => ({ ts: 1, level: 'info' as const, msg, attributes: {} });
  try {
    exporter.configure(target);
    exporter.push(record('before'));
    const pending = exporter.flush();
    exporter.push(record('queued'));
    exporter.configure(undefined);
    expect(signals[0]?.aborted).toBe(true);
    exporter.push(record('while off'));
    await pending;
    exporter.configure(target);
    exporter.push(record('after'));
    await exporter.flush();
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toContain('after');
    expect(bodies[1]).not.toContain('queued');
    expect(bodies[1]).not.toContain('while off');
  } finally {
    exporter.dispose();
  }
});
