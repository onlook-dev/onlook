import { env } from '@/env';
import { CodeSandbox } from '@codesandbox/sdk';
import { shortenUuid } from '@onlook/utility/src/id';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { CSB_BLANK_TEMPLATE_ID } from '@onlook/constants';

const sdk = new CodeSandbox(env.CSB_API_KEY);

export const sandboxRouter = createTRPCRouter({
    start: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            const startData = await sdk.sandboxes.resume(input.sandboxId);
            const session = await startData.createBrowserSession({
                id: shortenUuid(input.userId, 20),
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
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            const sandbox = await sdk.sandboxes.create({
                source: 'template',
                id: input.sandboxId,
            });
            return {
                sandboxId: sandbox.id,
                previewUrl: `https://${sandbox.id}-8084.csb.app`,
            };
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
            let session: any = null;
            let templateSandbox: any = null;

            try {
                templateSandbox = await sdk.sandboxes.create({
                    source: 'template',
                    id: CSB_BLANK_TEMPLATE_ID,
                });

                session = await templateSandbox.connect();

                // Upload all project files
                for (const [path, file] of Object.entries(input.files)) {
                    try {
                        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

                        // Handle binary vs text files using the correct SDK methods
                        if (file.isBinary) {
                            // For binary files, convert base64 string back to Uint8Array
                            const binaryData = Uint8Array.from(atob(file.content), (c) =>
                                c.charCodeAt(0),
                            );
                            await session.fs.writeFile(normalizedPath, binaryData);
                        } else {
                            // For text files, use writeTextFile
                            await session.fs.writeTextFile(normalizedPath, file.content);
                        }
                    } catch (fileError) {
                        console.error(`Error uploading file ${path}:`, fileError);
                        throw new Error(
                            `Failed to upload file: ${path} - ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
                        );
                    }
                }

                // Update package.json if dependencies are provided
                // if (input.dependencies || input.devDependencies || input.projectName) {
                //     try {
                //         const packageJsonPath = './package.json';
                //         let packageJson: any = {};

                //         try {
                //             const existingPackageJson =
                //                 await session.fs.readTextFile(packageJsonPath);
                //             packageJson = JSON.parse(existingPackageJson);
                //         } catch {
                //             // If package.json doesn't exist or can't be read, create a basic one
                //             packageJson = {
                //                 name: input.projectName || 'uploaded-project',
                //                 version: '1.0.0',
                //                 private: true,
                //             };
                //         }

                //         if (input.projectName) {
                //             packageJson.name = input.projectName;
                //         }
                //         if (input.dependencies) {
                //             packageJson.dependencies = {
                //                 ...packageJson.dependencies,
                //                 ...input.dependencies,
                //             };
                //         }
                //         if (input.devDependencies) {
                //             packageJson.devDependencies = {
                //                 ...packageJson.devDependencies,
                //                 ...input.devDependencies,
                //             };
                //         }

                //         await session.fs.writeTextFile(
                //             packageJsonPath,
                //             JSON.stringify(packageJson, null, 2),
                //         );
                //         console.log('Updated package.json');
                //     } catch (packageError) {
                //         console.error('Error updating package.json:', packageError);
                //         // Don't throw here, as the files are already uploaded
                //     }
                // }

                // Disconnect the session
                try {
                    await session.disconnect();
                    console.log('Disconnected session');
                } catch (disconnectError) {
                    console.error('Error disconnecting session:', disconnectError);
                }

                return {
                    sandboxId: templateSandbox.id,
                    previewUrl: `https://${templateSandbox.id}-8084.csb.app`,
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
    delete: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            await sdk.sandboxes.shutdown(input.sandboxId);
        }),
});
