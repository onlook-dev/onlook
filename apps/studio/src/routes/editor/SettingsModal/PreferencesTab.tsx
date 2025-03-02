import { useProjectsManager, useUserManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { ProjectTabs } from '@/lib/projects';
import { invokeMainChannel } from '@/lib/utils';
import { Language, LANGUAGE_DISPLAY_NAMES, MainChannels, Theme } from '@onlook/models/constants';
import { DEFAULT_IDE } from '@onlook/models/ide';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IDE } from '/common/ide';

const PreferencesTab = observer(() => {
    const userManager = useUserManager();
    const projectsManager = useProjectsManager();
    const { theme, nextTheme, setTheme } = useTheme();
    const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
    const [ide, setIde] = useState<IDE>(IDE.fromType(DEFAULT_IDE));
    const [shouldWarnDelete, setShouldWarnDelete] = useState(true);
    const { i18n } = useTranslation();

    const IDEIcon = Icons[ide.icon];

    useEffect(() => {
        setIde(IDE.fromType(userManager.settings.settings?.editor?.ideType || DEFAULT_IDE));
        setIsAnalyticsEnabled(userManager.settings.settings?.enableAnalytics || false);
        setShouldWarnDelete(userManager.settings.settings?.editor?.shouldWarnDelete ?? true);
    }, []);

    function updateIde(ide: IDE) {
        userManager.settings.updateEditor({ ideType: ide.type });
        setIde(ide);
    }

    function updateAnalytics(enabled: boolean) {
        userManager.settings.update({ enableAnalytics: enabled });
        invokeMainChannel(MainChannels.UPDATE_ANALYTICS_PREFERENCE, enabled);
        setIsAnalyticsEnabled(enabled);
    }

    function updateDeleteWarning(enabled: boolean) {
        userManager.settings.updateEditor({ shouldWarnDelete: enabled });
        setShouldWarnDelete(enabled);
    }

    function handleBackButtonClick() {
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Language Preference */}
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2">
                    <p className="text-foreground-onlook text-largePlus">Language</p>
                    <p className="text-foreground-onlook text-small">
                        Choose your preferred language
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {LANGUAGE_DISPLAY_NAMES[
                                i18n.language as keyof typeof LANGUAGE_DISPLAY_NAMES
                            ] || 'English'}
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[150px]">
                        {Object.entries(LANGUAGE_DISPLAY_NAMES).map(([code, name]) => (
                            <DropdownMenuItem
                                key={code}
                                onClick={() => userManager.language.update(code as Language)}
                            >
                                <span>{name}</span>
                                {i18n.language === code && (
                                    <Icons.CheckCircled className="ml-auto" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2">
                    <p className="text-foreground-onlook text-largePlus">Theme</p>
                    <p className="text-foreground-onlook text-small">
                        Choose your preferred appearance
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {theme === Theme.Dark && <Icons.Moon className="mr-2 h-4 w-4" />}
                            {theme === Theme.Light && <Icons.Sun className="mr-2 h-4 w-4" />}
                            {theme === Theme.System && <Icons.Laptop className="mr-2 h-4 w-4" />}
                            <span className="capitalize">{theme}</span>
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[150px]">
                        <DropdownMenuItem onClick={() => setTheme(Theme.Light)}>
                            <Icons.Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                            {theme === Theme.Light && <Icons.CheckCircled className="ml-auto" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(Theme.Dark)}>
                            <Icons.Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                            {theme === Theme.Dark && <Icons.CheckCircled className="ml-auto" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(Theme.System)}>
                            <Icons.Laptop className="mr-2 h-4 w-4" />
                            <span>System</span>
                            {theme === Theme.System && <Icons.CheckCircled className="ml-auto" />}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex justify-between items-center">
                <p className="text-foreground-onlook text-largePlus">Default Code Editor</p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="min-w-[150px]">
                            <IDEIcon className="text-default h-3 w-3 mr-2" />
                            <span className="smallPlus">{ide.displayName}</span>
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {IDE.getAll().map((item) => {
                            const ItemIcon = Icons[item.icon];
                            return (
                                <DropdownMenuItem
                                    key={item.displayName}
                                    className="text-smallPlus min-w-[140px]"
                                    onSelect={() => {
                                        updateIde(item);
                                    }}
                                >
                                    <ItemIcon className="text-default h-3 w-3 mr-2" />
                                    <span>{item.displayName}</span>
                                    {ide === item && <Icons.CheckCircled className="ml-auto" />}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className=" flex justify-between items-center gap-4">
                <div className=" flex flex-col gap-2">
                    <p className="text-foreground-onlook text-largePlus">{'Warn before delete'}</p>
                    <p className="text-foreground-onlook text-small">
                        {'This adds a warning before deleting elements in the editor'}
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {shouldWarnDelete ? 'On' : 'Off'}
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="text-smallPlus min-w-[150px]">
                        <DropdownMenuItem onClick={() => updateDeleteWarning(true)}>
                            {'Warning On'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateDeleteWarning(false)}>
                            {'Warning Off'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                    <p className="text-foreground-onlook text-largePlus">Analytics</p>
                    <p className="text-foreground-onlook text-small">
                        This helps our small team of two know what we need to improve with the
                        product.
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {isAnalyticsEnabled ? 'On' : 'Off'}
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="text-smallPlus min-w-[150px]">
                        <DropdownMenuItem onClick={() => updateAnalytics(true)}>
                            {'Analytics On'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateAnalytics(false)}>
                            {'Analytics Off'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});

export default PreferencesTab;
