import { api } from '@/trpc/react';
import { ProjectRole } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { useState } from 'react';

export const InviteMemberInput = ({ projectId }: { projectId: string }) => {
    const apiUtils = api.useUtils();
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<ProjectRole>(ProjectRole.ADMIN);

    const createInvitationMutation = api.invitation.create.useMutation({
        onSuccess: () => {
            apiUtils.invitation.list.invalidate();
            apiUtils.invitation.suggested.invalidate();
        },
        onError: (error) => {
            toast.error('Failed to invite member', {
                description: error instanceof Error ? error.message : String(error),
            });
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        createInvitationMutation.mutate({
            inviteeEmail: email,
            role: selectedRole,
            projectId: projectId,
        });
    };

    return (
        <form
            className="flex items-center gap-2 p-3 border-b justify-between"
            onSubmit={handleSubmit}
        >
            <div className="flex flex-1 items-center gap-2 relative">
                <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kiet@onlook.com"
                    className="flex-1"
                />
                {/* <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as ProjectRole)}
                >
                    <SelectTrigger className="w-22 text-xs border-0 p-2 rounded-tl-none rounded-bl-none focus:ring-0 bg-transparent absolute right-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ProjectRole.ADMIN}>
                            <div className="flex flex-col">
                                <span>Admin</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select> */}
            </div>
            <Button type="submit" disabled={!email}>
                Invite
            </Button>
        </form>
    );
};
