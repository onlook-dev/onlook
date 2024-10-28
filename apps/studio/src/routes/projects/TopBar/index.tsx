import { useAuthManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CreateMethod } from '@/routes/projects/helpers';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { ProjectTabs } from '..';
import { Icons } from '@/components/icons';

export const TopBar = observer(
    ({
        setCurrentTab,
        setCreateMethod,
    }: {
        setCurrentTab: (tab: ProjectTabs) => void;
        setCreateMethod: (method: CreateMethod | null) => void;
    }) => {
        const authManager = useAuthManager();
        const [userImage, setUserImage] = useState<string | null>(null);

        useEffect(() => {
            if (authManager.userMetadata?.avatarUrl) {
                setUserImage(authManager.userMetadata.avatarUrl);
            }
        }, [
            authManager.authenticated,
            authManager.userMetadata,
            authManager.userMetadata?.avatarUrl,
        ]);

        function signOut() {
            authManager.signOut();
        }

        function openSettings() {
            setCurrentTab(ProjectTabs.SETTINGS);
        }

        return (
            <div className="flex flex-row h-12 px-12 items-center">
                <div className="flex-1 flex items-center justify-start mt-3">
                    <Icons.OnlookTextLogo className="w-24" viewBox="0 0 139 17" />
                </div>
                <div className="flex-1 flex justify-end space-x-2 mt-4 items-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="text-sm text-foreground-onlook focus:outline-none"
                                variant="ghost"
                            >
                                <Icons.Plus className="w-5 h-5 mr-2" />
                                New Project
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                className={cn(
                                    'focus:bg-blue-100 focus:text-blue-900',
                                    'hover:bg-blue-100 hover:text-blue-900',
                                    'dark:focus:bg-blue-900 dark:focus:text-blue-100',
                                    'dark:hover:bg-blue-900 dark:hover:text-blue-100',
                                )}
                                onSelect={() => setCreateMethod(CreateMethod.NEW)}
                            >
                                <Icons.FilePlus className="w-4 h-4 mr-2" />
                                Start from scratch
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={cn(
                                    'focus:bg-teal-100 focus:text-teal-900',
                                    'hover:bg-teal-100 hover:text-teal-900',
                                    'dark:focus:bg-teal-900 dark:focus:text-teal-100',
                                    'dark:hover:bg-teal-900 dark:hover:text-teal-100',
                                )}
                                onSelect={() => setCreateMethod(CreateMethod.LOAD)}
                            >
                                <Icons.Download className="w-4 h-4 mr-2" />
                                Import existing project
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!authManager.isAuthEnabled}>
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
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={openSettings}>
                                <Icons.Gear className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={signOut}>
                                <Icons.Exit className="w-4 h-4 mr-2" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    },
);

export default TopBar;
