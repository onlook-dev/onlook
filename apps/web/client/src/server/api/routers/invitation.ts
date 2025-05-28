import { env } from '@/env';
import { emailClient } from '@/utils/email';
import {
    authUsers,
    projectInvitationInsertSchema,
    projectInvitations,
    userCanvases,
    userProjects
} from '@onlook/db';
import { sendInvitationEmail } from '@onlook/email';
import { ProjectRole } from '@onlook/models';
import { createDefaultUserCanvas } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import { and, eq } from 'drizzle-orm';
import urlJoin from 'url-join';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const invitationRouter = createTRPCRouter({
    list: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const invitations = await ctx.db.query.projectInvitations.findMany({
                where: eq(projectInvitations.projectId, input.projectId),
            });

            return invitations;
        }),
    create: protectedProcedure
        .input(
            projectInvitationInsertSchema.pick({
                projectId: true,
                inviteeEmail: true,
                role: true,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (!ctx.user.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to invite a user',
                });
            }

            const invitation = await ctx.db
                .transaction(async (tx) => {
                    const existingUser = await tx
                        .select()
                        .from(userProjects)
                        .innerJoin(authUsers, eq(authUsers.id, userProjects.userId))
                        .where(
                            and(
                                eq(userProjects.projectId, input.projectId),
                                eq(authUsers.email, input.inviteeEmail),
                            ),
                        )
                        .limit(1);

                    if (existingUser.length > 0) {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message: 'User is already a member of the project',
                        });
                    }

                    return await tx
                        .insert(projectInvitations)
                        .values([
                            {
                                ...input,
                                role: input.role as ProjectRole,
                                token: uuidv4(),
                                inviterId: ctx.user.id,
                                expiresAt: dayjs().add(7, 'day').toDate(),
                            },
                        ])
                        .returning();
                })
                .then(([invitation]) => invitation);

            if (invitation) {
                await sendInvitationEmail(
                    emailClient,
                    {
                        invitedByEmail: ctx.user.email,
                        inviteLink: urlJoin(
                            env.NEXT_PUBLIC_SITE_URL,
                            'invitation',
                            invitation.id,
                            new URLSearchParams([['token', invitation.token]]).toString(),
                        ),
                    },
                    {
                        dryRun: env.NODE_ENV !== 'production',
                    },
                );
            }
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(projectInvitations).where(eq(projectInvitations.id, input.id));
        }),
    accept: protectedProcedure
        .input(z.object({ token: z.string(), id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.user.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to accept an invitation',
                });
            }

            const invitation = await ctx.db.query.projectInvitations.findFirst({
                where: and(
                    eq(projectInvitations.id, input.id),
                    eq(projectInvitations.token, input.token),
                    eq(projectInvitations.inviteeEmail, ctx.user.email),
                ),
                with: {
                    project: {
                        with: {
                            canvas: true,
                        },
                    },
                },
            });

            if (!invitation || dayjs().isAfter(dayjs(invitation.expiresAt))) {
                if (invitation) {
                    await ctx.db
                        .delete(projectInvitations)
                        .where(eq(projectInvitations.id, invitation.id));
                }

                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invitation does not exist or has expired',
                });
            }

            await ctx.db.transaction(async (tx) => {
                await tx.delete(projectInvitations).where(eq(projectInvitations.id, invitation.id));

                await tx
                    .insert(userProjects)
                    .values({
                        projectId: invitation.projectId,
                        userId: ctx.user.id,
                        role: invitation.role,
                    })
                    .onConflictDoNothing();

                await tx
                    .insert(userCanvases)
                    .values(createDefaultUserCanvas(ctx.user.id, invitation.project.canvas.id))
                    .onConflictDoNothing();
            });
        }),
});
