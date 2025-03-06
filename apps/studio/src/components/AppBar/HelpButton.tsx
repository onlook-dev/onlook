import { useRouteManager, useUserManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { Route } from '@/lib/routes';
import { invokeMainChannel } from '@/lib/utils';
import {
    Language,
    LANGUAGE_DISPLAY_NAMES,
    Links,
    MainChannels,
    Theme,
} from '@onlook/models/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const HelpButton = observer(() => {
    const userManager = useUserManager();
    const routeManager = useRouteManager();

    const { theme, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { t } = useTranslation();

    if (routeManager.route === Route.EDITOR) {
        return null;
    }

    return (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <button className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 px-4 text-muted-foreground hover:text-foreground">
                    <Icons.QuestionMarkCircled className="w-5 h-5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-48"
                align="start"
                side="left"
                alignOffset={30}
                sideOffset={-10}
            >
                <DropdownMenuItem onClick={() => invokeMainChannel(MainChannels.RELOAD_APP)}>
                    <Icons.Reload className="w-4 h-4 mr-2" />
                    {t('help.menu.reloadOnlook')}
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                        {theme === Theme.Dark && <Icons.Moon className="w-4 h-4 mr-2" />}
                        {theme === Theme.Light && <Icons.Sun className="w-4 h-4 mr-2" />}
                        {theme === Theme.System && <Icons.Laptop className="w-4 h-4 mr-2" />}
                        {t('help.menu.theme.title')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-32 mr-2">
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setTheme(Theme.Light);
                            }}
                        >
                            <Icons.Sun className="w-4 h-4 mr-2" />
                            {t('help.menu.theme.light')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setTheme(Theme.Dark);
                            }}
                        >
                            <Icons.Moon className="w-4 h-4 mr-2" />
                            {t('help.menu.theme.dark')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setTheme(Theme.System);
                            }}
                        >
                            <Icons.Laptop className="w-4 h-4 mr-2" />
                            {t('help.menu.theme.system')}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                        <Icons.Globe className="w-4 h-4 mr-2" />
                        {t('help.menu.language')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-32 mr-2">
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => userManager.language.update(Language.English)}
                        >
                            {LANGUAGE_DISPLAY_NAMES[Language.English]}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => userManager.language.update(Language.Japanese)}
                        >
                            {LANGUAGE_DISPLAY_NAMES[Language.Japanese]}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => userManager.language.update(Language.Chinese)}
                        >
                            {LANGUAGE_DISPLAY_NAMES[Language.Chinese]}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                        <Icons.EnvelopeClosed className="w-4 h-4 mr-2" />
                        {t('help.menu.contactUs.title')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="mr-2">
                        <DropdownMenuItem
                            onClick={() => window.open('https://onlook.com', '_blank')}
                        >
                            <Icons.Globe className="w-4 h-4 mr-2" />
                            {t('help.menu.contactUs.website')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(Links.DISCORD, '_blank')}>
                            <Icons.DiscordLogo className="w-4 h-4 mr-2" />
                            {t('help.menu.contactUs.discord')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(Links.GITHUB, '_blank')}>
                            <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                            {t('help.menu.contactUs.github')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                                invokeMainChannel(
                                    MainChannels.OPEN_EXTERNAL_WINDOW,
                                    'mailto:contact@onlook.com',
                                )
                            }
                        >
                            <Icons.EnvelopeClosed className="w-4 h-4 mr-2" />
                            {t('help.menu.contactUs.email')}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => window.open(Links.OPEN_ISSUE, '_blank')}>
                    <Icons.ExclamationTriangle className="w-4 h-4 mr-2" />
                    {t('help.menu.reportIssue')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
