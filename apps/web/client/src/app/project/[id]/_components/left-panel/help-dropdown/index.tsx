import { useStateManager } from '@/components/store/state';
import { transKeys } from '@/i18n/keys';
import { Links, SUPPORT_EMAIL } from '@onlook/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const HelpDropdown = observer(() => {
    const stateManager = useStateManager();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const t = useTranslations();

    return (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
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
                {/* <<DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                        {theme === SystemTheme.DARK && <Icons.Moon className="w-4 h-4 mr-2" />}
                        {theme === SystemTheme.LIGHT && <Icons.Sun className="w-4 h-4 mr-2" />}
                        {theme === SystemTheme.SYSTEM && <Icons.Laptop className="w-4 h-4 mr-2" />}
                        {t(transKeys.help.menu.theme.title)}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-32 ml-2">
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setTheme(SystemTheme.LIGHT);
                            }}
                        >
                            <Icons.Sun className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.theme.light)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setTheme(SystemTheme.DARK);
                            }}
                        >
                            <Icons.Moon className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.theme.dark)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setTheme(SystemTheme.SYSTEM);
                            }}
                        >
                            <Icons.Laptop className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.theme.system)}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                        <Icons.Globe className="w-4 h-4 mr-2" />
                        {t(transKeys.help.menu.language)}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-32 ml-2">
                        {Object.values(Language).map((language) => (
                            <DropdownMenuItem
                                key={language}
                                className="text-sm"
                                onClick={() => userManager.language.update(language)}
                            >
                                {LANGUAGE_DISPLAY_NAMES[language]}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub> */}
                {/* <DropdownMenuItem
                    className="text-sm"
                    onClick={() => (editorEngine.state.hotkeysOpen = true)}
                >
                    <Icons.Keyboard className="w-4 h-4 mr-2" />
                    {t(transKeys.help.menu.shortcuts)}
                </DropdownMenuItem> */}
                <DropdownMenuItem
                    className="text-sm"
                    onClick={() => (stateManager.isSettingsModalOpen = true)}
                >
                    <Icons.Gear className="w-4 h-4 mr-2" />
                    {t(transKeys.help.menu.openSettings)}
                </DropdownMenuItem>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm gap-2">
                        <Icons.EnvelopeClosed className="w-4 h-4 mr-2" />
                        {t(transKeys.help.menu.contactUs.title)}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48 ml-2">
                        <DropdownMenuItem
                            onClick={() => window.open('https://onlook.com', '_blank')}
                        >
                            <Icons.Globe className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.contactUs.website)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => window.open(Links.DISCORD, '_blank')}
                        >
                            <Icons.DiscordLogo className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.contactUs.discord)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => window.open(Links.GITHUB, '_blank')}
                        >
                            <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.contactUs.github)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
                        >
                            <Icons.EnvelopeClosed className="w-4 h-4 mr-2" />
                            {t(transKeys.help.menu.contactUs.email)}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                    className="text-sm"
                    onClick={() => {
                        setIsDropdownOpen(false);
                        stateManager.isFeedbackModalOpen = true;
                    }}
                >
                    <Icons.MessageSquare className="w-4 h-4 mr-2" />
                    Send Feedback
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
