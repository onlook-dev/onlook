import { userInsertSchema, users } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const userRouter = createTRPCRouter({
    getById: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, input),
            with: {
                userProjects: {
                    with: {
                        project: true,
                    },
                },
            },
        });
        return user;
    }),
    create: publicProcedure.input(userInsertSchema).mutation(async ({ ctx, input }) => {
        const user = await ctx.db.insert(users).values(input).returning({ id: users.id });
        if (!user[0]) {
            throw new Error('Failed to create user');
        }
        return user[0];
    }),
});
