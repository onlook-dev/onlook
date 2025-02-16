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

export const HelpDropdown = () => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 text-muted-foreground hover:text-foreground">
                    <Icons.QuestionMarkCircled className="w-5 h-5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                side="left"
                alignOffset={55}
                sideOffset={-45}
                className="w-48"
            >
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
