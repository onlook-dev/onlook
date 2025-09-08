import { SandboxFileWatchInput, SandboxFileWatchOutput } from '@/provider/definition/sandbox/file';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env } from 'bun';
import { streamSSE } from 'hono/streaming';
import { v4 as uuid } from 'uuid';

const BodySchema: z.ZodType<SandboxFileWatchInput> = z.object({
    path: z.string().openapi({
        description: 'The path of the file to write.',
        example: '/path/to/file.txt',
    }),
    recursive: z.boolean().openapi({
        description: 'Whether to watch the file recursively.',
        example: false,
    }),
    excludePaths: z.array(z.string()).openapi({
        description: 'The paths to exclude from the watch.',
        example: ['/path/to/exclude'],
    }),
});

const route = createRoute({
    method: 'post',
    path: env.URL_PATH_PREFIX + '/api/sandbox/file/watch',
    security: [{ jwt: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: BodySchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'text/event-stream': {
                    schema: z.string().openapi({
                        description: 'A stream of server-sent events.',
                    }),
                },
            },
            description: 'Return file watch events. Design for SSE',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_file_watch(app: LocalHono) {
    app.openapi(route, async (c) => {
        const query = await c.req.valid('json');
        return streamSSE(c, async (stream) => {
            // Send a "connected" message immediately
            await stream.writeSSE({
                id: uuid(),
                event: 'status',
                data: 'Connected to endpoint.',
            });

            const onOutput = (res: SandboxFileWatchOutput) => {
                stream.writeSSE({
                    id: res.id,
                    event: 'message',
                    data: JSON.stringify({ events: res.events }),
                });
            };

            const { close } = await c.get('client').sandbox.file.watch(query, onOutput);

            let open = true;
            stream.onAbort(() => {
                close();
                open = false;
            });

            while (open) {
                await stream.writeSSE({
                    id: uuid(),
                    event: 'status',
                    data: 'Endpoint is still open.',
                });
                await stream.sleep(5000);
            }
        });
    });
}
