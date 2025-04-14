import { list, start, stop } from "@/utils/codesandbox/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const csbRouter = createTRPCRouter({
    start: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await start(input);
        }),
    stop: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await stop(input);
        }),
    list: publicProcedure
        .mutation(async () => {
            return await list();
        }),
}); 