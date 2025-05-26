import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { canvases, toCanvas } from "@onlook/db";

export const canvasRouter = createTRPCRouter({
    getCanvas: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const dbCanvas = await ctx.db.query.canvases.findFirst({
            where: eq(canvases.projectId, input.projectId),
        });
        if (!dbCanvas) {
            return null;
        }
        return toCanvas(dbCanvas);
    }),
});