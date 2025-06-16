import { env } from '@/env';
import { CodeSandbox, Sandbox, WebSocketSession } from '@codesandbox/sdk';
import { CSB_PREVIEW_TASK_NAME, getSandboxPreviewUrl, SandboxTemplates, Templates } from '@onlook/constants';
import { generate, parse } from '@onlook/parser';
import { addScriptConfig } from '@onlook/parser/src/code-edit/config';
import { shortenUuid } from '@onlook/utility/src/id';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const sdk = new CodeSandbox(env.CSB_API_KEY);

export const sandboxRouter = createTRPCRouter({
    start: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
                userId: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const startData = await sdk.sandboxes.resume(input.sandboxId);
            const session = await startData.createBrowserSession({
                id: shortenUuid(input.userId ?? uuidv4(), 20),
            });
            return session;
        }),
    hibernate: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            await sdk.sandboxes.hibernate(input.sandboxId);
        }),
    list: protectedProcedure.query(async () => {
        const listResponse = await sdk.sandboxes.list();
        return listResponse;
    }),
    fork: protectedProcedure
        .input(
            z.object({
                sandbox: z.object({
                    id: z.string(),
                    port: z.number(),
                }),
            }),
        )
        .mutation(async ({ input }) => {
            const sandbox = await sdk.sandboxes.create({
                source: 'template',
                id: input.sandbox.id,
            });

            const previewUrl = getSandboxPreviewUrl(sandbox.id, input.sandbox.port);

            return {
                sandboxId: sandbox.id,
                previewUrl,
            };
        }),
    delete: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            await sdk.sandboxes.shutdown(input.sandboxId);
        }),
    uploadProject: protectedProcedure
        .input(
            z.object({
                files: z.record(
                    z.object({
                        content: z.string(),
                        isBinary: z.boolean().optional(),
                    }),
                ),
                projectName: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            let session: WebSocketSession | null = null;
            let templateSandbox: Sandbox | null = null;

            try {
                const template = SandboxTemplates[Templates.BLANK];

                templateSandbox = await sdk.sandboxes.create({
                    source: 'template',
                    id: template.id,
                });

                session = await templateSandbox.connect();

                // Upload all project files
                for (const [path, file] of Object.entries(input.files)) {
                    try {
                        // Handle binary vs text files using the correct SDK methods
                        if (file.isBinary) {
                            // For binary files, convert base64 string back to Uint8Array
                            const binaryData = Uint8Array.from(atob(file.content), (c) =>
                                c.charCodeAt(0),
                            );
                            await session.fs.writeFile(path, binaryData, {
                                overwrite: true,
                            });
                        } else {
                            // For text files, use writeTextFile
                            let content = file.content;

                            // Add script config to the file 'app/layout.tsx' or 'src/app/layout.tsx'
                            if (path === 'app/layout.tsx' || path === 'src/app/layout.tsx') {
                                try {
                                    const ast = parse(content, {
                                        sourceType: 'module',
                                        plugins: ['jsx', 'typescript'],
                                    });
                                    const modifiedAst = addScriptConfig(ast);
                                    content = generate(modifiedAst, {}, content).code;
                                } catch (parseError) {
                                    console.warn('Failed to add script config to layout.tsx:', parseError);
                                }
                            }

                            await session.fs.writeTextFile(path, content, {
                                overwrite: true,
                            });
                        }
                    } catch (fileError) {
                        console.error(`Error uploading file ${path}:`, fileError);
                        throw new Error(
                            `Failed to upload file: ${path} - ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
                        );
                    }
                }

                // Run setup task
                await session.setup.run();

                // Start the dev task
                const task = await session.tasks.get(CSB_PREVIEW_TASK_NAME);
                if (task) {
                    await task.run();
                }

                // Disconnect the session
                try {
                    await session.disconnect();
                    console.log('Disconnected session');
                } catch (disconnectError) {
                    console.error('Error disconnecting session:', disconnectError);
                }

                return {
                    sandboxId: templateSandbox.id,
                    previewUrl: getSandboxPreviewUrl(templateSandbox.id, template.port),
                };
            } catch (error) {
                console.error('Error creating project sandbox:', error);
                if (session) {
                    try {
                        await session.disconnect();
                        console.log('Disconnected session during cleanup');
                    } catch (cleanupError) {
                        console.error('Error disconnecting session during cleanup:', cleanupError);
                    }
                }

                if (templateSandbox?.id) {
                    try {
                        await sdk.sandboxes.shutdown(templateSandbox.id);
                        console.log('Cleaned up failed sandbox:', templateSandbox.id);
                    } catch (cleanupError) {
                        console.error('Error cleaning up sandbox:', cleanupError);
                    }
                }

                throw new Error(
                    `Failed to create project sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
            }
        }),
});
