import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
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
        return <div className="p-3 text-muted-foreground text-sm">Loading...</div>;
    }

    return (
        <>
            <div className="border-b border-b-[0.5px] p-3 text-muted-foreground text-sm">
                Invite Others
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
