import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons/index';
import { InvitationRow } from './invitation-row';
import { InviteMemberInput } from './invite-member-input';
import { MemberRow } from './member-row';
import { SuggestedTeammates } from './suggested-teammates';

export const MembersContent = () => {
    const editorEngine = useEditorEngine();
    const projectId = editorEngine.projectId;
    const { data: members, isLoading: loadingMembers } = api.member.list.useQuery({
        projectId,
    });
    const { data: invitations, isLoading: loadingInvitations } = api.invitation.list.useQuery({
        projectId,
    });

    if (loadingMembers && loadingInvitations) {
        return <div className="h-32 gap-2 p-3 text-muted-foreground text-sm flex items-center justify-center">
            <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
            <div className="text-sm">Loading members...</div>
        </div>;
    }

    return (
        <>
            <div className="border-b border-b-[0.5px] p-3 text-muted-foreground text-sm">
                Invite Team Members
            </div>
            <InviteMemberInput projectId={projectId} />
            {members?.map((member) => (
                <MemberRow key={member.user.id} user={member.user} role={member.role} />
            ))}
            {invitations?.map((invitation) => (
                <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
            <SuggestedTeammates projectId={projectId} />
        </>
    );
};
