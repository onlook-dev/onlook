interface ReplayRequest {
  method?: string;
  url?: string;
  timeout?: number;
  fetchOptions?: Record<string, unknown>;
  callback?: (response: unknown) => void;
}

export interface ReplayTransportSdk {
  __loaded?: boolean;
  __request_queue: unknown[];
  _requestQueue?: { _queue: unknown[] };
  _retryQueue?: { _queue: unknown[] };
  _send_request: (request: ReplayRequest) => void;
}

/** What posthog-js `request()` applies to a request that names no timeout of its own. */
const SDK_TIMEOUT_MS = 60_000;

/** Named `AbortError` like the SDK's own timeout reason, which its feature-flag errors classify on. */
function expired(ms: number): Error {
  const reason = new Error(`replay request timed out after ${String(ms)}ms`);
  reason.name = 'AbortError';
  return reason;
}

export function replayRequestConsent(sdk: ReplayTransportSdk): (enabled: boolean) => void {
  let enabled = false;
  let compatible = true;
  let live = new AbortController();
  const send = sdk._send_request.bind(sdk);
  sdk._send_request = (request) => {
    if (!enabled || !compatible) return;
    const sent = live;
    const holds = (): boolean => enabled && sent === live;
    // The recorder's configuration answer still lands across an off and on, so it keeps the SDK's own signal.
    const configuration = request.method === 'GET' && request.url !== undefined && URL.canParse(request.url)
      && /^\/array\/[^/]+\/config$/.test(new URL(request.url).pathname);
    const ms = request.timeout !== undefined && request.timeout > 0 ? request.timeout : SDK_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    send({
      ...request,
      ...(configuration ? {} : {
        fetchOptions: {
          ...request.fetchOptions,
          // Read at dispatch, after an awaited gzip: throws before `fetch`, and aborts one already on the wire (ONL-2904).
          get signal(): AbortSignal {
            if (!holds()) throw new Error('replay consent withdrawn');
            const expiry = new AbortController();
            timer = setTimeout(() => { expiry.abort(expired(ms)); }, ms);
            return AbortSignal.any([sent.signal, expiry.signal]);
          },
        },
      }),
      callback: (response) => {
        if (timer !== undefined) clearTimeout(timer);
        if (configuration || holds()) request.callback?.(response);
      },
    });
  };
  return (next) => {
    if (enabled === next) return;
    enabled = next;
    if (next) return;
    live.abort();
    live = new AbortController();
    const queues: Array<unknown[] | undefined> = [sdk.__request_queue];
    if (sdk.__loaded === true) queues.push(sdk._requestQueue?._queue, sdk._retryQueue?._queue);
    for (const queue of queues) {
      if (Array.isArray(queue)) queue.length = 0;
      else compatible = false;
    }
  };
}
