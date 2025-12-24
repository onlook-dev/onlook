import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { ComponentsPanelService } from '@onlook/platform-extensions';

export const componentsPanelRouter = createTRPCRouter({
  initialize: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      const service = new ComponentsPanelService();
      await service.initialize(input.projectId);
      return { success: true };
    }),

  getCategories: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const service = new ComponentsPanelService();
      await service.initialize(input.projectId);
      return service.getCategories();
    }),

  searchComponents: protectedProcedure
    .input(z.object({ 
      projectId: z.string(),
      query: z.string()
    }))
    .query(async ({ input }) => {
      const service = new ComponentsPanelService();
      await service.initialize(input.projectId);
      return service.searchComponents(input.query);
    }),

  filterByCategory: protectedProcedure
    .input(z.object({ 
      projectId: z.string(),
      categoryId: z.string()
    }))
    .query(async ({ input }) => {
      const service = new ComponentsPanelService();
      await service.initialize(input.projectId);
      return service.filterByCategory(input.categoryId);
    }),

  insertComponent: protectedProcedure
    .input(z.object({
      componentId: z.string(),
      targetElementId: z.string(),
      position: z.enum(['before', 'after', 'inside', 'replace']),
    }))
    .mutation(async ({ input }) => {
      const service = new ComponentsPanelService();
      return service.insertComponent(
        input.componentId,
        input.targetElementId,
        input.position
      );
    }),

  addCustomComponent: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      component: z.object({
        name: z.string(),
        category: z.string(),
        description: z.string().optional(),
        props: z.array(z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
          defaultValue: z.any().optional(),
          description: z.string().optional(),
          options: z.array(z.string()).optional(),
        })),
        code: z.string(),
        framework: z.string(),
        tags: z.array(z.string()),
      }),
    }))
    .mutation(async ({ input }) => {
      const service = new ComponentsPanelService();
      return service.addCustomComponent(input.projectId, input.component);
    }),
});