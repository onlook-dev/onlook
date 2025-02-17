import { useEditorEngine } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { invokeMainChannel } from '@/lib/utils';
import { Links, MainChannels } from '@onlook/models/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { SettingsModal, TabValue } from '../TopBar/ProjectSelect/SettingsModal';

export const HelpDropdown = observer(() => {
    const editorEngine = useEditorEngine();
    const { theme, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <button className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 text-muted-foreground hover:text-foreground">
                        <Icons.QuestionMarkCircled className="w-5 h-5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    side="left"
                    alignOffset={55}
                    sideOffset={-55}
                    className="w-48"
                >
                    <DropdownMenuItem
                        className="text-sm"
                        onClick={() => {
                            setIsDropdownOpen(false);
                            if (theme === 'light') {
                                setTheme('dark');
                            } else if (theme === 'dark') {
                                setTheme('system');
                            } else {
                                setTheme('light');
                            }
                        }}
                    >
                        {theme === 'dark' && <Icons.Moon className="w-4 h-4 mr-2" />}
                        {theme === 'light' && <Icons.Sun className="w-4 h-4 mr-2" />}
                        {theme === 'system' && <Icons.Laptop className="w-4 h-4 mr-2" />}
                        {theme === 'dark' && 'Dark Theme'}
                        {theme === 'light' && 'Light Theme'}
                        {theme === 'system' && 'System Theme'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-sm"
                        onClick={() => {
                            setIsDropdownOpen(false);
                            setIsSettingsOpen(true);
                        }}
                    >
                        <Icons.Gear className="w-4 h-4 mr-2" />
                        Open Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.open('https://onlook.com', '_blank')}>
                        <Icons.InfoCircled className="w-4 h-4 mr-2" />
                        About Onlook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(Links.DISCORD, '_blank')}>
                        <Icons.DiscordLogo className="w-4 h-4 mr-2" />
                        Join our Discord
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(Links.GITHUB, '_blank')}>
                        <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                        Visit our GitHub
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() =>
                            invokeMainChannel(
                                MainChannels.OPEN_EXTERNAL_WINDOW,
                                'mailto:contact@onlook.com',
                            )
                        }
                    >
                        <Icons.EnvelopeClosed className="w-4 h-4 mr-2" />
                        Email Us
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(Links.OPEN_ISSUE, '_blank')}>
                        <Icons.ExclamationTriangle className="w-4 h-4 mr-2" />
                        Report Issue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => invokeMainChannel(MainChannels.RELOAD_APP)}>
                        <Icons.Reload className="w-4 h-4 mr-2" />
                        Reload Onlook
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <SettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                activeTab={TabValue.PREFERENCES}
            />
        </>
    );
});
