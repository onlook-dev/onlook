import {
    SandboxTerminalWriteInput,
    SandboxTerminalWriteOutput,
} from '@/provider/definition/sandbox/terminal';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env } from 'bun';

const BodySchema: z.ZodType<SandboxTerminalWriteInput> = z.object({
    terminalId: z.string().openapi({
        description: 'The ID of the terminal.',
        example: '00000000-0000-0000-0000-000000000000 or any unique string',
    }),
    input: z.string().openapi({
        description: 'The input to the write command.',
        example: 'ls -la',
    }),
});

const ResponseSchema: z.ZodType<SandboxTerminalWriteOutput> = z.object({
    output: z.string().openapi({
        description: 'The output of the write command.',
    }),
});

const route = createRoute({
    method: 'post',
    path: env.URL_PATH_PREFIX + '/api/sandbox/terminal/write',
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
            description: 'Write a terminal in the sandbox.',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_terminal_write(app: LocalHono) {
    app.openapi(route, async (c) => {
        const body = await c.req.valid('json');
        const result = await c.get('client').sandbox.terminal.write(body);
        return c.json(result, 200);
    });
}
