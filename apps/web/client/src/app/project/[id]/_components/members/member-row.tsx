import type { ProjectRole, User } from '@onlook/models';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { getInitials } from '@onlook/utility';

interface MemberRowProps {
    user: User;
    role: ProjectRole;
}

export const MemberRow = ({ user, role }: MemberRowProps) => {
    const initials = getInitials(user.displayName ?? '');

    return (
        <div className="py-2 px-3 flex gap-2 items-center">
            <Avatar>
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center gap-0.5 flex-1">
                <div>{user.firstName ?? user.displayName}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
        </div>
    );
};
