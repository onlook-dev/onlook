import { mastra } from '@/mastra';
import {
    toOnlookConversationFromMastra,
    toOnlookMessageFromMastra,
} from '@onlook/db';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const conversationRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const threadsResult = await storage.getThreadsByResourceId({
                resourceId: input.projectId,
            })
            return threadsResult.map((thread) => toOnlookConversationFromMastra(thread));
        }),
    create: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ input }) => {
            const { onlookAgent } = mastra.getAgents()
            const memory = onlookAgent.getMemory()
            if (!memory) {
                throw new Error('Memory not found');
            }
            const thread = await memory.createThread({
                resourceId: input.projectId,
            });

            return toOnlookConversationFromMastra(thread);
        }),
    update: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            title: z.string(),
            metadata: z.record(z.string(), z.any()),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const thread = await storage.updateThread({
                id: input.conversationId,
                title: input.title,
                metadata: input.metadata,
            });

            return toOnlookConversationFromMastra(thread);
        }),
    delete: protectedProcedure
        .input(z.object({
            conversationId: z.string()
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            await storage.deleteThread({
                threadId: input.conversationId,
            });
        }),
});

const messageRouter = createTRPCRouter({
    get: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
        }))
        .query(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const messagesResult = await storage.getMessages({
                threadId: input.conversationId,
                format: 'v2',
            })
            return messagesResult.map((message) => toOnlookMessageFromMastra(message));
        }),
    update: protectedProcedure
        .input(z.object({
            messages: z.array(z.object({
                id: z.string(),
                content: z.object({
                    metadata: z.record(z.string(), z.any()),
                    parts: z.array(z.any()),
                }),
            })),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const messages = await storage.updateMessages({
                messages: input.messages
            });
            return messages.map((message) => toOnlookMessageFromMastra(message));
        }),

    delete: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            messageIds: z.array(z.string()),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            // TODO: Wait for mastra to support this
            // await storage.deleteMessages({
            //     threadId: input.conversationId,
            //     messageIds: input.messageIds,
            // });
        }),
})

export const chatRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
});
