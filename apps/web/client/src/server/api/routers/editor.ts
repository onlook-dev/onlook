import { editorServerConfig, type EditorRouter } from '@onlook/rpc';
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superJSON from 'superjson';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

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
        start: publicProcedure.input(z.object({ projectId: z.string() })).mutation(({ input }) => {
            return editorClient.sandbox.start.mutate(input);
        }),
        status: publicProcedure.input(z.object({ sandboxId: z.string() })).query(({ input }) => {
            return editorClient.sandbox.status.query(input);
        }),

        stop: publicProcedure.input(z.object({ sandboxId: z.string() })).mutation(({ input }) => {
            return editorClient.sandbox.stop.mutate(input);
        }),
    }),
});
