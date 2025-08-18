import { env } from '@/env';
import { api } from '@/trpc/react';
import type { ProjectInvitation } from '@onlook/db';
import { constructInvitationLink } from '@onlook/email';
import { Avatar, AvatarFallback } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { getInitials } from '@onlook/utility';
import { useState } from 'react';

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
            await navigator.clipboard.writeText(constructInvitationLink(env.NEXT_PUBLIC_SITE_URL, invitation.id, invitation.token));
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
        <div className="py-2 px-3 flex gap-2 items-center">
            <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center gap-0.5 text-muted-foreground text-sm flex-1">
                <div>Pending Invitation</div>
                <div>{invitation.inviteeEmail}</div>
            </div>
            <div className="flex flex-row items-center justify-center ">
                <Tooltip>
                    <TooltipTrigger>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={copyInvitationLink}
                        >
                            {isCopied ? <Icons.Check className="size-4 text-muted-foreground transition-colors" /> : <Icons.Copy className="size-4 text-muted-foreground transition-colors" />}
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
                            <Icons.MailX className="size-4 text-muted-foreground transition-colors" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Cancel Invitation
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};
