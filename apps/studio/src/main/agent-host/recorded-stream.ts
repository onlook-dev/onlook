import { query, type Query } from '@anthropic-ai/claude-agent-sdk';

export function recordingQuery(record: (message: unknown) => void): typeof query {
  return (params) => {
    const live = query(params);
    const recorded: Query = new Proxy(live, {
      get(target, prop) {
        if (prop === 'next') {
          return async (...args: []) => {
            const step = await target.next(...args);
            if (step.done !== true) record(step.value);
            return step;
          };
        }
        if (prop === Symbol.asyncIterator) return () => recorded;
        const value: unknown = Reflect.get(target, prop, target);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
      },
    });
    return recorded;
  };
}
