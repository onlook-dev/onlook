'use client';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Skeleton } from '@onlook/ui/skeleton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export function Main({ invitationId }: { invitationId: string }) {
    const router = useRouter();
    const token = useSearchParams().get('token');
    const { data: invitation, isLoading: loadingInvitation } = api.invitation.get.useQuery({
        id: invitationId,
    });
    const acceptInvitationMutation = api.invitation.accept.useMutation({
        onSuccess: () => {
            router.push(Routes.PROJECTS);
        },
    });

    if (loadingInvitation) {
        return (
            <div className="flex justify-center w-full h-full">
                <div className="flex flex-col items-center justify-center w-5/6 md:w-1/2 gap-4">
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-40" />
                    <div className="flex justify-center">
                        <Skeleton className="w-full h-10 w-20" />
                    </div>
                </div>
            </div>
        );
    }

    if (!invitation || !token) {
        return (
            <div className="flex flex-row w-full">
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="text-xl text-foreground-secondary">Invitation not found</div>
                    <div className="text-md text-foreground-tertiary">
                        The invitation you are looking for does not exist or has expired.
                    </div>
                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                            Back to home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const inviter = invitation.inviter.firstName ?? invitation.inviter.displayName ?? invitation.inviter.email;

    return (
        <div className="flex flex-row w-full">
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="text-xl">Join {inviter} on Onlook</div>
                <div className="text-md text-foreground-tertiary">
                    {inviter} has invited you to join their project
                </div>
                <div className="flex justify-center">
                    <Button
                        type="button"
                        onClick={() => {
                            acceptInvitationMutation.mutate({
                                id: invitationId,
                                token: invitation.token,
                            });
                        }}
                        disabled={acceptInvitationMutation.isPending}
                    >
                        Join Project
                    </Button>
                </div>
            </div>
        </div>
    );
}
