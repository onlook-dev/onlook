import { useAuthManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

const UserProfileDropdown = observer(({ children }: { children: React.ReactNode }) => {
    const [userImage, setUserImage] = useState<string | null>(null);
    const authManager = useAuthManager();

    useEffect(() => {
        if (authManager.userMetadata?.avatarUrl) {
            setUserImage(authManager.userMetadata.avatarUrl);
        }
    }, [authManager.authenticated, authManager.userMetadata?.avatarUrl]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="w-8 h-8 p-0 bg-background-onlook rounded-full focus:outline-none group">
                    {userImage && (
                        <img
                            className="w-8 h-8 rounded-full object-cover group-hover:ease-in-out group-hover:transition group-hover:duration-100 group-hover:ring-1 group-hover:ring-gray-600"
                            src={userImage}
                            alt="User avatar"
                            referrerPolicy={'no-referrer'}
                        />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{children}</DropdownMenuContent>
        </DropdownMenu>
    );
});

export default UserProfileDropdown;
