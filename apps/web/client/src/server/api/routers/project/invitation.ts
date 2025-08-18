import { env } from '@/env';
import {
    authUsers,
    createDefaultUserCanvas,
    projectInvitationInsertSchema,
    projectInvitations,
    toUser,
    userCanvases,
    userProjects,
    users,
} from '@onlook/db';
import { constructInvitationLink, getResendClient, sendInvitationEmail } from '@onlook/email';
import { ProjectRole } from '@onlook/models';
import { isFreeEmail } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import { addDays, isAfter } from 'date-fns';
import { and, eq, ilike, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const invitationRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const invitation = await ctx.db.query.projectInvitations.findFirst({
            where: eq(projectInvitations.id, input.id),
            with: {
                inviter: true,
            },
        });

        if (!invitation) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Invitation not found',
            });
        }

        if (!invitation.inviter) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Inviter not found',
            });
        }

        return {
            ...invitation,
            // @ts-expect-error - Drizzle is not typed correctly
            inviter: toUser(invitation.inviter),
        };
    }),
    getWithoutToken: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const invitation = await ctx.db.query.projectInvitations.findFirst({
            where: eq(projectInvitations.id, input.id),
            with: {
                inviter: true,
            },
        });

        if (!invitation) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Invitation not found',
            });
        }

        if (!invitation.inviter) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Inviter not found',
            });
        }

        return {
            ...invitation,
            token: null,
            // @ts-expect-error - Drizzle is not typed correctly
            inviter: toUser(invitation.inviter),
        };
    }),
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
            const inviter = await ctx.db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });

            if (!inviter) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Inviter not found',
                });
            }

            const [invitation] = await ctx.db
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
                                expiresAt: addDays(new Date(), 7),
                            },
                        ])
                        .returning();
                })

            if (invitation) {
                if (!env.RESEND_API_KEY) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'RESEND_API_KEY is not set, cannot send email',
                    });
                }
                const emailClient = getResendClient({
                    apiKey: env.RESEND_API_KEY,
                });

                const result = await sendInvitationEmail(
                    emailClient,
                    {
                        inviteeEmail: input.inviteeEmail,
                        invitedByName: inviter.firstName ?? inviter.displayName ?? undefined,
                        invitedByEmail: ctx.user.email,
                        inviteLink: constructInvitationLink(
                            env.NEXT_PUBLIC_SITE_URL,
                            invitation.id,
                            invitation.token,
                        ),
                    },
                    {
                        dryRun: env.NODE_ENV !== 'production',
                    },
                );
            }

            return invitation;
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(projectInvitations).where(eq(projectInvitations.id, input.id));

            return true;
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
                ),
                with: {
                    project: {
                        with: {
                            canvas: true,
                        },
                    },
                },
            });

            if (!invitation) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invitation does not exist',
                });
            }

            if (invitation.inviteeEmail !== ctx.user.email) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `This invitation was sent to ${invitation.inviteeEmail}. Please sign in with that email address.`,
                });
            }

            if (isAfter(new Date(), invitation.expiresAt)) {
                if (invitation) {
                    await ctx.db
                        .delete(projectInvitations)
                        .where(eq(projectInvitations.id, invitation.id));
                }

                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invitation has expired',
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
    suggested: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            if (isFreeEmail(ctx.user.email)) {
                return [];
            }
            const domain = ctx.user.email.split('@').at(-1);

            const suggestedUsers = await ctx.db
                .select()
                .from(authUsers)
                .leftJoin(
                    userProjects,
                    and(
                        eq(userProjects.userId, authUsers.id),
                        eq(userProjects.projectId, input.projectId),
                    ),
                )
                .leftJoin(
                    projectInvitations,
                    and(
                        eq(projectInvitations.inviteeEmail, authUsers.email),
                        eq(projectInvitations.projectId, input.projectId),
                    ),
                )
                .where(
                    and(
                        ilike(authUsers.email, `%@${domain}`),
                        isNull(userProjects.userId), // Not in the project
                        isNull(projectInvitations.id), // Not invited
                    ),
                )
                .limit(5);

            return suggestedUsers.map((user) => user.users.email);
        }),
});
