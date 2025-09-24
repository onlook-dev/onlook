import { useState } from 'react';

import type { ProjectInvitation } from '@onlook/db';
import { constructInvitationLink } from '@onlook/email';
import { Avatar, AvatarFallback } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { getInitials } from '@onlook/utility';

import { env } from '@/env';
import { api } from '@/trpc/react';

export const InvitationRow = ({ invitation }: { invitation: ProjectInvitation }) => {
    const apiUtils = api.useUtils();
    const initials = getInitials(invitation.inviteeEmail ?? '');
    const [isCopied, setIsCopied] = useState(false);
    const cancelInvitationMutation = api.invitation.delete.useMutation({
        onSuccess: () => {
            apiUtils.invitation.list.invalidate();
        },
    });

    const copyInvitationLink = async () => {
        try {
            await navigator.clipboard.writeText(
                constructInvitationLink(env.NEXT_PUBLIC_SITE_URL, invitation.id, invitation.token),
            );
            setIsCopied(true);
            toast.success('Invitation link copied to clipboard');
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy invitation link:', error);
            toast.error('Failed to copy invitation link');
            setIsCopied(false);
        }
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2">
            <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="text-muted-foreground flex flex-1 flex-col justify-center gap-0.5 text-sm">
                <div>Pending Invitation</div>
                <div className="truncate text-xs">{invitation.inviteeEmail}</div>
            </div>
            <div className="flex flex-row items-center justify-center">
                <Tooltip>
                    <TooltipTrigger>
                        <Button variant="ghost" size="icon" onClick={copyInvitationLink}>
                            {isCopied ? (
                                <Icons.Check className="text-muted-foreground size-4 transition-colors" />
                            ) : (
                                <Icons.Copy className="text-muted-foreground size-4 transition-colors" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isCopied ? 'Copied to clipboard' : 'Copy Invitation Link'}
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                cancelInvitationMutation.mutate({ id: invitation.id });
                            }}
                        >
                            <Icons.MailX className="text-muted-foreground size-4 transition-colors" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel Invitation</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};
