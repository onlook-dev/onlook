import { mastra } from '@/mastra';
import {
    toOnlookMessageFromMastra
} from '@onlook/db';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const messageRouter = createTRPCRouter({
    getAll: protectedProcedure
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
            messageIds: z.array(z.string()),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            await storage.deleteMessages(input.messageIds);
        }),
})
