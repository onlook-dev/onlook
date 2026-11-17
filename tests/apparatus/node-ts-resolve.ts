import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    // The specifier as written first; `.ts`-first would let a source file shadow compiled output.
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.endsWith('.js')) {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      }
      throw error;
    }
  },
});
