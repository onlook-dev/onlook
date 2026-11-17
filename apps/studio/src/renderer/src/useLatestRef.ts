import { useInsertionEffect, useRef, type RefObject } from 'react';

/**
 * `useInsertionEffect`, not the render body — a render-body write leaks values
 * from renders that never commit (react-doctor/no-ref-current-in-render) — and
 * not `useEffect`, which flushes after paint and leaves a window where an event
 * reads the previous handler.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
}
