import { initModel } from '@onlook/ai';
import {
    conversationInsertSchema,
    conversations,
    conversationUpdateSchema,
    fromDbConversation,
    messages
} from '@onlook/db';
import { LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { generateText } from 'ai';
import { eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const conversationRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.projectId),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
            return dbConversations.map((conversation) => fromDbConversation(conversation));
        }),
    get: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            return fromDbConversation(conversation);
        }),
    upsert: protectedProcedure
        .input(conversationInsertSchema)
        .mutation(async ({ ctx, input }) => {
            const [conversation] = await ctx.db.insert(conversations).values(input).returning();
            if (!conversation) {
                throw new Error('Conversation not created');
            }
            return fromDbConversation(conversation);
        }),
    update: protectedProcedure
        .input(conversationUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            const [conversation] = await ctx.db.update({
                ...conversations,
                updatedAt: new Date(),
            }).set(input)
                .where(eq(conversations.id, input.id)).returning();
            if (!conversation) {
                throw new Error('Conversation not updated');
            }
            return fromDbConversation(conversation);
        }),
    delete: protectedProcedure
        .input(z.object({
            conversationId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(conversations).where(eq(conversations.id, input.conversationId));
        }),
    
    // Subchat operations
    getSubchats: protectedProcedure
        .input(z.object({
            parentConversationId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const subchats = await ctx.db.query.conversations.findMany({
                where: eq(conversations.parentConversationId, input.parentConversationId),
                orderBy: (conversations, { asc }) => [asc(conversations.createdAt)],
            });
            return subchats.map((subchat) => fromDbConversation(subchat));
        }),
    
    createSubchat: protectedProcedure
        .input(z.object({
            projectId: z.string(),
            parentConversationId: z.string(),
            parentMessageId: z.string().optional(),
            displayName: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify parent conversation exists and belongs to the same project
            const parentConversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.parentConversationId),
            });
            
            if (!parentConversation) {
                throw new Error('Parent conversation not found');
            }
            
            if (parentConversation.projectId !== input.projectId) {
                throw new Error('Parent conversation does not belong to the specified project');
            }
            
            // If parentMessageId provided, verify it exists and belongs to the parent conversation
            if (input.parentMessageId) {
                const parentMessage = await ctx.db.query.messages.findFirst({
                    where: eq(messages.id, input.parentMessageId),
                });
                
                if (!parentMessage || parentMessage.conversationId !== input.parentConversationId) {
                    throw new Error('Parent message not found or does not belong to the parent conversation');
                }
            }
            
            const [subchat] = await ctx.db.insert(conversations).values({
                projectId: input.projectId,
                parentConversationId: input.parentConversationId,
                parentMessageId: input.parentMessageId || null,
                displayName: input.displayName || null,
                suggestions: [],
            }).returning();
            
            if (!subchat) {
                throw new Error('Subchat not created');
            }
            
            return fromDbConversation(subchat);
        }),
    
    getRootConversations: protectedProcedure
        .input(z.object({ 
            projectId: z.string() 
        }))
        .query(async ({ ctx, input }) => {
            // Get only root conversations (no parent)
            const rootConversations = await ctx.db.query.conversations.findMany({
                where: (conversations, { eq, and, isNull }) => and(
                    eq(conversations.projectId, input.projectId),
                    isNull(conversations.parentConversationId)
                ),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
            return rootConversations.map((conversation) => fromDbConversation(conversation));
        }),
    
    getConversationTree: protectedProcedure
        .input(z.object({
            conversationId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            // Get the root conversation and all its descendants
            const buildTree = async (parentId: string): Promise<any> => {
                const conversation = await ctx.db.query.conversations.findFirst({
                    where: eq(conversations.id, parentId),
                });
                
                if (!conversation) {
                    return null;
                }
                
                const subchats = await ctx.db.query.conversations.findMany({
                    where: eq(conversations.parentConversationId, parentId),
                    orderBy: (conversations, { asc }) => [asc(conversations.createdAt)],
                });
                
                const subchatTrees = await Promise.all(
                    subchats.map(subchat => buildTree(subchat.id))
                );
                
                return {
                    ...fromDbConversation(conversation),
                    subchats: subchatTrees.filter(Boolean)
                };
            };
            
            return await buildTree(input.conversationId);
        }),
        
    generateTitle: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { model, providerOptions, headers } = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.CLAUDE_3_5_HAIKU,
            });

            const MAX_NAME_LENGTH = 50;
            const result = await generateText({
                model,
                headers,
                prompt: `Generate a concise and meaningful conversation title (2-4 words maximum) that reflects the main purpose or theme of the conversation based on user's creation prompt. Generate only the conversation title, nothing else. Keep it short and descriptive. User's creation prompt: <prompt>${input.content}</prompt>`,
                providerOptions,
                maxOutputTokens: 50,
                experimental_telemetry: {
                    isEnabled: true,
                    metadata: {
                        conversationId: input.conversationId,
                        userId: ctx.user.id,
                        tags: ['conversation-title-generation'],
                        sessionId: input.conversationId,
                        langfuseTraceId: uuidv4(),
                    },
                },
            });

            const generatedName = result.text.trim();
            if (generatedName && generatedName.length > 0 && generatedName.length <= MAX_NAME_LENGTH) {
                await ctx.db.update(conversations).set({
                    displayName: generatedName,
                }).where(eq(conversations.id, input.conversationId));
                return generatedName;
            }

            console.error('Error generating conversation title', result);
            return null;
        }),
});
