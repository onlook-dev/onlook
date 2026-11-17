declare const __COMMIT_SHA__: string;

// Bun unit tests never apply Vite's `define`; a bare reference throws ReferenceError (ONL-1964).
export const COMMIT_SHA: string =
  typeof __COMMIT_SHA__ === 'string' && __COMMIT_SHA__.length > 0 ? __COMMIT_SHA__ : 'unknown';
