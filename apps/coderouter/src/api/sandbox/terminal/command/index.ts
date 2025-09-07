import {
    SandboxTerminalCommandInput,
    SandboxTerminalCommandOutput,
} from '@/provider/definition/sandbox/terminal';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env } from 'bun';

const BodySchema: z.ZodType<SandboxTerminalCommandInput> = z.object({
    command: z.string().openapi({
        description: 'The command to run.',
        example: 'ls -la',
    }),
});

const ResponseSchema: z.ZodType<SandboxTerminalCommandOutput> = z.object({
    is_error: z.boolean().openapi({
        description: 'Whether the command was successful.',
        example: true,
    }),
    output: z.string().openapi({
        description: 'The output of the command.',
        example: 'ls -la',
    }),
    stdout: z.string().openapi({
        description: 'The stdout of the command.',
        example: 'ls -la',
    }),
    stderr: z.string().openapi({
        description: 'The stderr of the command.',
        example: 'ls -la',
    }),
    exit_code: z.number().openapi({
        description: 'The exit code of the command.',
        example: 0,
    }),
});

const route = createRoute({
    method: 'post',
    path: env.URL_PATH_PREFIX + '/api/sandbox/terminal/command',
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
            description: 'Run a command in the sandbox.',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_terminal_command(app: LocalHono) {
    app.openapi(route, async (c) => {
        const body = await c.req.valid('json');
        const result = await c.get('client').sandbox.terminal.command(body);
        return c.json(result, 200);
    });
}
