import { branches, branchInsertSchema, branchUpdateSchema, fromDbBranch } from '@onlook/db';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const branchRouter = createTRPCRouter({
    getByProjectId: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbBranches = await ctx.db.query.branches.findMany({
                where: eq(branches.projectId, input.projectId),
            });
            if (!dbBranches || dbBranches.length === 0) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Branches not found',
                });
            }
            return dbBranches.map(fromDbBranch);
        }),
    create: protectedProcedure
        .input(branchInsertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.insert(branches).values(input);
                return true;
            } catch (error) {
                console.error('Error creating frame', error);
                return false;
            }
        }),
    update: protectedProcedure.input(branchUpdateSchema).mutation(async ({ ctx, input }) => {
        try {
            await ctx.db
                .update(branches)
                .set(input)
                .where(
                    eq(branches.id, input.id)
                );
            return true;
        } catch (error) {
            console.error('Error updating frame', error);
            return false;
        }
    }),
    delete: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.delete(branches).where(eq(branches.id, input.branchId));
                return true;
            } catch (error) {
                console.error('Error deleting frame', error);
                return false;
            }
        }),
});
