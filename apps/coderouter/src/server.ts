import 'dotenv/config';
import { OpenAPIHono } from '@hono/zod-openapi';
import { api_sandbox_create } from './api/sandbox/create';
import { api_sandbox_file_copy } from './api/sandbox/file/copy';
import { api_sandbox_file_delete } from './api/sandbox/file/delete';
import { api_sandbox_file_download } from './api/sandbox/file/download';
import { api_sandbox_file_list } from './api/sandbox/file/list';
import { api_sandbox_file_read } from './api/sandbox/file/read';
import { api_sandbox_file_rename } from './api/sandbox/file/rename';
import { api_sandbox_file_stat } from './api/sandbox/file/stat';
import { api_sandbox_file_watch } from './api/sandbox/file/watch';
import { api_sandbox_file_write } from './api/sandbox/file/write';
import { api_sandbox_pause } from './api/sandbox/pause';
import { api_sandbox_resume } from './api/sandbox/resume';
import { api_sandbox_stop } from './api/sandbox/stop';
import { api_sandbox_url } from './api/sandbox/url';
import { Client } from './provider/definition';
import { setupClientMiddleware } from './middleware/client';
import { api_auth_sign } from './api/auth/sign';
import { AuthJwtPayload } from './util/auth';
import { setupAuthJwtMiddleware } from './middleware/auth';
import { setupRequiredSandboxIdMiddleware } from './middleware/requireSandboxId';
import { env, serve } from 'bun';
import { setupBeforeSandboxCallMiddleware } from './middleware/beforeSandboxCall';
import { setupErrorMiddleware } from './middleware/error';
import { api_sandbox_terminal_create } from './api/sandbox/terminal/create';
import { api_sandbox_terminal_command } from './api/sandbox/terminal/command';
import { api_sandbox_terminal_open } from './api/sandbox/terminal/open';
import { api_sandbox_terminal_run } from './api/sandbox/terminal/run';
import { api_sandbox_terminal_write } from './api/sandbox/terminal/write';
import { api_sandbox_terminal_kill } from './api/sandbox/terminal/kill';
import { streamSSE } from 'hono/streaming';

export interface Variables {
    client: Client;
    auth: AuthJwtPayload;
}

export type LocalHono = OpenAPIHono<{ Variables: Variables }>;

const app: LocalHono = new OpenAPIHono<{ Variables: Variables }>();

app.openAPIRegistry.registerComponent('securitySchemes', 'apikey', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'apikey',
});

app.openAPIRegistry.registerComponent('securitySchemes', 'jwt', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
});

const basePath = env.URL_PATH_PREFIX + '/api';

// must be first
setupErrorMiddleware(app);

// /auth/sign is not protected by this middleware
setupAuthJwtMiddleware(app, basePath + '/sandbox/*');
// sandbox ID is required for all sandbox routes
setupRequiredSandboxIdMiddleware(app, basePath + '/sandbox/*');
// must be last
setupClientMiddleware(app, basePath + '/sandbox/*');

setupBeforeSandboxCallMiddleware(app, basePath + '/sandbox/pause');
setupBeforeSandboxCallMiddleware(app, basePath + '/sandbox/resume');
setupBeforeSandboxCallMiddleware(app, basePath + '/sandbox/stop');
setupBeforeSandboxCallMiddleware(app, basePath + '/sandbox/url');
setupBeforeSandboxCallMiddleware(app, basePath + '/sandbox/file/*');
setupBeforeSandboxCallMiddleware(app, basePath + '/sandbox/terminal/*');

// auth routes
api_auth_sign(app);

// sandbox routes
api_sandbox_create(app);
api_sandbox_pause(app);
api_sandbox_resume(app);
api_sandbox_stop(app);
api_sandbox_url(app);

// sandbox file routes
api_sandbox_file_copy(app);
api_sandbox_file_delete(app);
api_sandbox_file_download(app);
api_sandbox_file_list(app);
api_sandbox_file_read(app);
api_sandbox_file_rename(app);
api_sandbox_file_stat(app);
api_sandbox_file_watch(app);
api_sandbox_file_write(app);

// sandbox terminal routes
api_sandbox_terminal_command(app);
api_sandbox_terminal_create(app);
api_sandbox_terminal_open(app);
api_sandbox_terminal_run(app);
api_sandbox_terminal_write(app);
api_sandbox_terminal_kill(app);

app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
        version: '1.0.0',
        title: 'Coderouter',
    },
});

export default {
    fetch: app.fetch,
    port: 4444,
};
