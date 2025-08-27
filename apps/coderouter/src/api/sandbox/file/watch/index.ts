import { SandboxFileWatchInput, SandboxFileWatchOutput } from '@/provider/definition/sandbox/file';
import { LocalHono } from '@/server';
import { JwtAuthResponses } from '@/util/auth';
import { createRoute, z } from '@hono/zod-openapi';
import { env } from 'bun';

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

const ResponseSchema: z.ZodType<SandboxFileWatchOutput> = z.object({
    events: z.array(
        z.object({
            path: z.string(),
            type: z.enum(['create', 'update', 'delete']),
        }),
    ),
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
                'application/json': {
                    schema: ResponseSchema,
                },
            },
            description: 'Watch a file to the sandbox.',
        },
        ...JwtAuthResponses,
    },
});

export function api_sandbox_file_watch(app: LocalHono) {
    app.openapi(route, async (c) => {
        const body = await c.req.valid('json');
        const result = await c.get('client').sandbox.file.watch(body);
        return c.json(result, 200);
    });
}
