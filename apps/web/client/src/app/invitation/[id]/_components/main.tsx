'use client';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import { getReturnUrlQueryParam } from '@/utils/url';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Skeleton } from '@onlook/ui/skeleton';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function Main({ invitationId }: { invitationId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const token = useSearchParams().get('token');
    const { data: invitation, isLoading: loadingInvitation, error: getInvitationError } = api.invitation.getWithoutToken.useQuery({
        id: invitationId,
    });

    const { mutate: acceptInvitation, isPending: isAcceptingInvitation, error: acceptInvitationError } = api.invitation.accept.useMutation({
        onSuccess: () => {
            if (invitation?.projectId) {
                router.push(`${Routes.PROJECT}/${invitation.projectId}`);
            } else {
                router.push(Routes.PROJECTS);
            }
        },
    });

    const handleLogin = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        router.push(`${Routes.LOGIN}?${getReturnUrlQueryParam(currentUrl)}`);
    }

    const error = getInvitationError || acceptInvitationError;

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

    if (error) {
        return (
            <div className="flex flex-row w-full">
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-4">
                        <Icons.ExclamationTriangle className="h-6 w-6" />
                        <div className="text-2xl">Error accepting invitation</div>
                    </div>
                    <div className="text-md">
                        {error.message}
                    </div>
                    <div className="flex justify-center gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                router.push(Routes.PROJECTS);
                            }}
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                            Back to home
                        </Button>
                        <Button
                            type="button"
                            onClick={handleLogin}
                        >
                            Log in with different account
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!invitation || !token) {
        return (
            <div className="flex flex-row w-full">
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-4">
                        <Icons.ExclamationTriangle className="h-6 w-6" />
                        <div className="text-xl">Invitation not found</div>
                    </div>
                    <div className="text-md">
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
                            acceptInvitation({
                                id: invitationId,
                                token: token,
                            });
                        }}
                        disabled={!token || isAcceptingInvitation}
                    >
                        Accept Invitation
                    </Button>
                </div>
            </div>
        </div>
    );
}
