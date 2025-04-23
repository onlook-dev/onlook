import { create, hibernate, list, start } from "@/utils/codesandbox/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const csbRouter = createTRPCRouter({
    create: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await create(input);
        }),
    start: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await start(input);
        }),
    hibernate: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await hibernate(input);
        }),
    list: publicProcedure
        .query(async () => {
            return await list();
        }),
});  