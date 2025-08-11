import { mastra } from '@/mastra';
import {
    toOnlookConversationFromMastra
} from '@onlook/db';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const conversationRouter = createTRPCRouter({
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
    get: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const thread = await storage.getThreadById({
                threadId: input.conversationId,
            })
            if (!thread) {
                throw new Error('Conversation not found');
            }
            return toOnlookConversationFromMastra(thread);
        }),
    create: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ input }) => {
            const { onlookAgent } = mastra.getAgents()
            const memory = await onlookAgent.getMemory()
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
