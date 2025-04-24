import ws from '@fastify/websocket';
import type { EditorServerOptions } from '@onlook/rpc';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import fastify from 'fastify';
import { appRouter } from './router';
import { createContext } from './router/context';

export function createServer(opts: EditorServerOptions) {
    const dev = opts.dev ?? true;
    const port = opts.port ?? 8080;
    const trpcPrefix = opts.prefix ?? '/api/trpc';
    const server = fastify({ logger: dev });

    server.register(ws);
    server.register(fastifyTRPCPlugin, {
        prefix: trpcPrefix,
        useWSS: true,
        trpcOptions: { router: appRouter, createContext },
    });

    server.get('/', async () => {
        return { hello: 'onlook' };
    });

    const stop = async () => {
        await server.close();
    };
    const start = async () => {
        try {
            await server.listen({ port });
            console.log('listening on port', port);
        } catch (err) {
            server.log.error(err);
            process.exit(1);
        }
    };

    return { server, start, stop };
}