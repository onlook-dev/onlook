import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superJSON from 'superjson';
import { z } from 'zod';

import type { EditorRouter } from '@onlook/rpc';
import { editorServerConfig } from '@onlook/rpc';

import { createTRPCRouter, publicProcedure } from '../../trpc';

const { port, prefix } = editorServerConfig;
const urlEnd = `localhost:${port}${prefix}`;
const wsClient = createWSClient({ url: `ws://${urlEnd}` });

const editorClient = createTRPCClient<EditorRouter>({
    links: [
        splitLink({
            condition(op) {
                return op.type === 'subscription';
            },
            true: wsLink({ client: wsClient, transformer: superJSON }),
            false: httpBatchLink({
                url: `http://${urlEnd}`,
                transformer: superJSON,
            }),
        }),
    ],
});

// Export the router with all the forwarded procedures
export const editorForwardRouter = createTRPCRouter({
    sandbox: createTRPCRouter({
        create: publicProcedure.input(z.string()).mutation(({ input }) => {
            return editorClient.sandbox.create.mutate(input);
        }),
        start: publicProcedure.input(z.string()).mutation(({ input }) => {
            return editorClient.sandbox.start.mutate(input);
        }),

        stop: publicProcedure.input(z.string()).mutation(({ input }) => {
            return editorClient.sandbox.stop.mutate(input);
        }),
        status: publicProcedure.input(z.string()).query(({ input }) => {
            return editorClient.sandbox.status.query(input);
        }),
    }),
});
