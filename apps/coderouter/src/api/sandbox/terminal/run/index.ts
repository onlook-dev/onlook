import {
    SandboxTerminalRunInput,
    SandboxTerminalRunOutput,
} from '@/provider/definition/sandbox/terminal';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env } from 'bun';

const BodySchema: z.ZodType<SandboxTerminalRunInput> = z.object({
    terminalId: z.string().openapi({
        description: 'The ID of the terminal.',
        example: '00000000-0000-0000-0000-000000000000 or any unique string',
    }),
    input: z.string().openapi({
        description: 'The name of the terminal.',
        example: 'My Terminal',
    }),
});

const ResponseSchema: z.ZodType<SandboxTerminalRunOutput> = z.object({
    output: z.string().openapi({
        description:
            'Combined stdout/stderr captured from the terminal around the command execution.',
        example: '$ ls -la\\n.\\n..\\nREADME.md\\n',
    }),
});

const route = createRoute({
    method: 'post',
    path: env.URL_PATH_PREFIX + '/api/sandbox/terminal/run',
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
            description: 'Run a terminal in the sandbox.',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_terminal_run(app: LocalHono) {
    app.openapi(route, async (c) => {
        const body = await c.req.valid('json');
        const result = await c.get('client').sandbox.terminal.run(body);
        return c.json(result, 200);
    });
}
