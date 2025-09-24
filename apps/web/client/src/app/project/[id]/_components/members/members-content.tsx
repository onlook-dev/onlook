import { Icons } from '@onlook/ui/icons/index';

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
        return (
            <div className="text-muted-foreground flex h-32 items-center justify-center gap-2 p-3 text-sm">
                <Icons.LoadingSpinner className="text-foreground-primary h-6 w-6 animate-spin" />
                <div className="text-sm">Loading members...</div>
            </div>
        );
    }

    return (
        <>
            <div className="text-muted-foreground border-b border-b-[0.5px] p-3 text-sm">
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
