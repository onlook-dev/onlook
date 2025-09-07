// import {
//     SandboxTerminalOpenInput,
//     SandboxTerminalOpenOutput,
// } from '@/provider/definition/sandbox/terminal';
import { SandboxTerminalOpenOutput } from '@/provider/definition/sandbox/terminal';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env, sleep } from 'bun';
import { streamSSE } from 'hono/streaming';
import { v4 as uuid } from 'uuid';

const ParamsSchema = z.object({
    terminalId: z.string().openapi({
        description: 'The ID of the terminal.',
        example: '00000000-0000-0000-0000-000000000000 or any unique string',
    }),
});

const route = createRoute({
    method: 'get',
    path: env.URL_PATH_PREFIX + '/api/sandbox/terminal/open',
    security: [{ jwt: [] }],
    request: {
        query: ParamsSchema,
    },
    responses: {
        200: {
            content: {
                'text/event-stream': {
                    schema: z.string().openapi({
                        description:
                            'A stream of server-sent events (not JSON array, continuous text).',
                    }),
                },
            },
            description: 'Return the output of a terminal in the sandbox. Design for long-polling',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_terminal_open(app: LocalHono) {
    app.openapi(route, async (c) => {
        const query = await c.req.valid('query');
        return streamSSE(c, async (stream) => {
            // Send a "connected" message immediately
            await stream.writeSSE({
                id: uuid(),
                event: 'status',
                data: 'Connected to endpoint.',
            });

            const onOutput = (res: SandboxTerminalOpenOutput) => {
                console.log(res.output);
                stream.writeSSE({
                    id: res.id,
                    event: 'message',
                    data: JSON.stringify({ output: res.output }),
                });
            };

            const { close } = await c.get('client').sandbox.terminal.open(query, onOutput);

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
                await sleep(5000);
            }
        });
    });
}
