import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { CommentService } from '@onlook/platform-extensions';

export const commentsRouter = createTRPCRouter({
  createComment: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      elementId: z.string(),
      content: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        elementSelector: z.string(),
        pageUrl: z.string(),
      }),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = new CommentService();
      return service.createComment(
        input.projectId,
        input.elementId,
        input.content,
        input.position,
        input.userId
      );
    }),

  resolveComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ input }) => {
      const service = new CommentService();
      return service.resolveComment(input.commentId);
    }),

  addReply: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      content: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = new CommentService();
      return service.addReply(input.commentId, input.content, input.userId);
    }),

  mentionUser: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = new CommentService();
      return service.mentionUser(input.commentId, input.userId);
    }),

  getCommentThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      const service = new CommentService();
      return service.getCommentThread(input.threadId);
    }),

  getCommentsForElement: protectedProcedure
    .input(z.object({ elementId: z.string() }))
    .query(async ({ input }) => {
      const service = new CommentService();
      return service.getCommentsForElement(input.elementId);
    }),

  getProjectComments: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const service = new CommentService();
      return service.getProjectComments(input.projectId);
    }),
});