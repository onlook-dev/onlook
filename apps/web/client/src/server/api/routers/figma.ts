import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { FigmaIntegrationService } from '@onlook/platform-extensions';

export const figmaRouter = createTRPCRouter({
  authenticate: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const service = new FigmaIntegrationService();
      return service.authenticate(input.token);
    }),

  importFile: protectedProcedure
    .input(z.object({ 
      fileId: z.string(),
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const service = new FigmaIntegrationService();
      await service.authenticate(input.token);
      return service.importFile(input.fileId);
    }),

  extractAssets: protectedProcedure
    .input(z.object({ 
      fileId: z.string(),
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const service = new FigmaIntegrationService();
      await service.authenticate(input.token);
      return service.extractAssets(input.fileId);
    }),

  convertComponents: protectedProcedure
    .input(z.object({ 
      components: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        properties: z.array(z.any()),
        styles: z.array(z.any()),
        children: z.array(z.any()),
      }))
    }))
    .mutation(async ({ input }) => {
      const service = new FigmaIntegrationService();
      return service.convertComponents(input.components);
    }),

  extractDesignTokens: protectedProcedure
    .input(z.object({ 
      fileId: z.string(),
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const service = new FigmaIntegrationService();
      await service.authenticate(input.token);
      return service.extractDesignTokens(input.fileId);
    }),
});