import { editorServerConfig, type EditorRouter } from '@onlook/web-shared';
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superJSON from 'superjson';
import { publicProcedure } from '../trpc';

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

function createProxy<T extends Record<string, any>>(client: T, path: string[] = []): any {
    return Object.keys(client).reduce((acc: any, key: string) => {
        const currentPath = [...path, key];
        const procedure = client[key];
        if (typeof procedure === 'function') {
            acc[key] = publicProcedure
                .input(procedure._def.$types.input)
                .output(procedure._def.$types.output)
                .query(({ input }: { input: any }) => procedure.query(input));
        } else {
            acc[key] = createProxy(procedure, currentPath);
        }
        return acc;
    }, {});
}


export const editorForwardRouter = {
    hello: publicProcedure.query(() => {
        return editorClient.api.hello.query();
    }),
};
