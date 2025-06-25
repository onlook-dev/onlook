import { api } from '@/trpc/react';
import { ProjectRole } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';

interface SuggestedTeammateProps {
    projectId: string;
}

export const SuggestedTeammates = ({ projectId }: SuggestedTeammateProps) => {
    const apiUtils = api.useUtils();
    const { data: suggestedUsers } = api.invitation.suggested.useQuery({ projectId });
    const createInvitationMutation = api.invitation.create.useMutation({
        onSuccess: () => {
            apiUtils.invitation.suggested.invalidate();
            apiUtils.invitation.list.invalidate();
        },
    });

    return (
        <div className="flex flex-col gap-2 p-3">
            <Separator />
            <div className="space-y-0.5">
                <div className="text-sm">Suggested Teammates</div>
                <div className="text-xs text-muted-foreground">
                    Invite relevant people to collaborate
                </div>
            </div>
            <div className="flex gap-0.5">
                {suggestedUsers?.map((email) => (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-xl font-normal"
                        onClick={() => {
                            createInvitationMutation.mutate({
                                projectId,
                                inviteeEmail: email,
                                role: ProjectRole.ADMIN,
                            });
                        }}
                    >
                        {email}
                        <Icons.PlusCircled className="ml-1 size-4" />
                    </Button>
                ))}
            </div>
        </div>
    );
};
