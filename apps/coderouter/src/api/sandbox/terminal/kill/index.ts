import {
    SandboxTerminalKillInput,
    SandboxTerminalKillOutput,
} from '@/provider/definition/sandbox/terminal';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env } from 'bun';

const BodySchema: z.ZodType<SandboxTerminalKillInput> = z.object({
    terminalId: z.string().openapi({
        description: 'The ID of the terminal.',
        example: '00000000-0000-0000-0000-000000000000 or any unique string',
    }),
});

const ResponseSchema: z.ZodType<SandboxTerminalKillOutput> = z.object({
    output: z.string().openapi({
        description: 'The output of the kill command.',
        example: 'Terminal killed',
    }),
});

const route = createRoute({
    method: 'post',
    path: env.URL_PATH_PREFIX + '/api/sandbox/terminal/kill',
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
                'application/json': {
                    schema: ResponseSchema,
                },
            },
            description: 'Kill a terminal in the sandbox.',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_terminal_kill(app: LocalHono) {
    app.openapi(route, async (c) => {
        const body = await c.req.valid('json');
        const result = await c.get('client').sandbox.terminal.kill(body);
        return c.json(result, 200);
    });
}
