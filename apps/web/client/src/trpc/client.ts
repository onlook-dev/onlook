import { createTRPCClient } from '@trpc/client';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import { type AppRouter } from '~/server/api/root';
import { links } from './helpers';

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const api = createTRPCClient<AppRouter>({
    links,
});
