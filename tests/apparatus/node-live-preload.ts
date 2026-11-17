import './node-ts-resolve.ts';
import { registerHooks } from 'node:module';

const ENV_READ = 'import.meta.env';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'electron') {
      return { url: new URL('./src/node-electron.ts', import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  // Vite bakes `import.meta.env` and Bun aliases it to `process.env`; Node leaves it undefined.
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    const esm = loaded.format === 'module' || loaded.format === 'module-typescript';
    if (!esm || !url.startsWith('file:') || url.includes('/node_modules/') || loaded.source === undefined) return loaded;
    const source = typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source as Uint8Array).toString('utf8');
    if (!source.includes(ENV_READ)) return loaded;
    return { ...loaded, source: `${ENV_READ} ??= process.env; ${source}` };
  },
});
