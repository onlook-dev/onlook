import { editorServerConfig, type EditorRouter } from '@onlook/web-shared';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superJSON from 'superjson';
import { createTRPCRouter } from '../trpc';

const editorClient = createTRPCClient<EditorRouter>({
    links: [
        httpBatchLink({
            url: `${editorServerConfig.dev ? 'http' : 'https'}://${editorServerConfig.dev ? 'localhost' : 'onlook.dev'}${editorServerConfig.prefix}`,
            transformer: superJSON,
        }),
    ],
});

function createProxy<T extends Record<string, any>>(client: T, path: string[] = []): any {
    return Object.keys(client).reduce((acc: any, key: string) => {
        const currentPath = [...path, key];
        const procedure = client[key];
        if (typeof procedure === 'function') {
            acc[key] = t.procedure
                .input(procedure._def.$types.input)
                .output(procedure._def.$types.output)
                .query(({ input }: { input: any }) => procedure.query(input));
        } else {
            acc[key] = createProxy(procedure, currentPath);
        }
        return acc;
    }, {});
}


export const editorForwardRouter = createTRPCRouter(createProxy(editorClient));
