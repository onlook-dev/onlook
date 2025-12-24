import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { AssetManagementService } from '@onlook/platform-extensions';

export const assetsRouter = createTRPCRouter({
  uploadAsset: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      fileData: z.string(), // base64 encoded
    }))
    .mutation(async ({ input }) => {
      const service = new AssetManagementService();
      
      // Convert base64 to File object (simplified)
      const buffer = Buffer.from(input.fileData, 'base64');
      const file = new File([buffer], input.fileName, { type: input.fileType });
      
      return service.uploadAsset(file, input.projectId);
    }),

  optimizeAsset: protectedProcedure
    .input(z.object({
      assetId: z.string(),
      options: z.object({
        format: z.string(),
        quality: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const service = new AssetManagementService();
      return service.optimizeAsset(input.assetId, input.options);
    }),

  generateImportStatement: protectedProcedure
    .input(z.object({
      assetId: z.string(),
      filePath: z.string(),
    }))
    .query(async ({ input }) => {
      const service = new AssetManagementService();
      return service.generateImportStatement(input.assetId, input.filePath);
    }),

  updateAssetReferences: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ input }) => {
      const service = new AssetManagementService();
      return service.updateAssetReferences(input.assetId);
    }),

  getProjectAssets: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const service = new AssetManagementService();
      return service.getProjectAssets(input.projectId);
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ input }) => {
      const service = new AssetManagementService();
      return service.deleteAsset(input.assetId);
    }),

  organizeAssets: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      assetIds: z.array(z.string()),
      folderName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = new AssetManagementService();
      return service.organizeAssets(input.projectId, input.assetIds, input.folderName);
    }),
});