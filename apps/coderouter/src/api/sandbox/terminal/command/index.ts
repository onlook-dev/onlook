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
        description: 'True if the command failed.',
        example: false,
    }),
    output: z.string().openapi({
        description: 'Combined output (stdout + stderr).',
        example: 'total 0',
    }),
    stdout: z.string().optional().openapi({
        description: 'The stdout of the command.',
        example: 'total 0',
    }),
    stderr: z.string().optional().openapi({
        description: 'The stderr of the command.',
        example: '',
    }),
    exit_code: z.number().optional().openapi({
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
