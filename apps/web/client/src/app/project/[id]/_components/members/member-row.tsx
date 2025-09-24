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
        <div className="flex items-center gap-2 px-3 py-2">
            <Avatar>
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col justify-center gap-0.5">
                <div>{user.firstName ?? user.displayName}</div>
                <div className="text-muted-foreground text-xs">{user.email}</div>
            </div>
        </div>
    );
};
