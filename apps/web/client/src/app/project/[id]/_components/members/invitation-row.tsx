import { api } from '@/trpc/react';
import type { Invitation } from '@onlook/models';
import { Avatar, AvatarFallback } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { getInitials } from '@onlook/utility';

interface InvitationRowProps {
    invitation: Invitation;
}

export const InvitationRow = ({ invitation }: InvitationRowProps) => {
    const apiUtils = api.useUtils();
    const initials = getInitials(invitation.inviteeEmail ?? '');
    const cancelInvitationMutation = api.invitation.delete.useMutation({
        onSuccess: () => {
            apiUtils.invitation.list.invalidate();
        },
    });

    return (
        <div className="py-2 px-3 flex gap-2 items-center">
            <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center gap-0.5 text-muted-foreground text-sm flex-1">
                <div>Pending Invitation</div>
                <div>{invitation.inviteeEmail}</div>
            </div>
            <div className="flex flex-col items-center justify-center">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        cancelInvitationMutation.mutate({ id: invitation.id });
                    }}
                >
                    <Icons.MailX className="size-4 text-muted-foreground transition-colors" />
                </Button>
            </div>
        </div>
    );
};
