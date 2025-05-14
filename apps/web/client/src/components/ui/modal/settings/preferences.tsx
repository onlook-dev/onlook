import { IDE } from '@/components/ide';
import { useUserManager } from '@/components/store/user';
import type { Language } from '@onlook/constants';
import { LANGUAGE_DISPLAY_NAMES } from '@onlook/constants';
import { SystemTheme } from '@onlook/models';
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
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';

export const PreferencesTab = observer(() => {
    const userManager = useUserManager();
    const { theme, setTheme } = useTheme();
    const locale = useLocale();

    const ide = IDE.fromType(userManager.settings.settings?.editor?.ideType || DEFAULT_IDE);
    const isAnalyticsEnabled = userManager.settings.settings?.enableAnalytics || false;
    const shouldWarnDelete = userManager.settings.settings?.editor?.shouldWarnDelete ?? true;
    const IDEIcon = Icons[ide.icon];

    async function updateIde(ide: IDE) {
        await userManager.settings.updateEditor({ ideType: ide.type });
    }

    async function updateAnalytics(enabled: boolean) {
        await userManager.settings.update({ enableAnalytics: enabled });
        invokeMainChannel(MainChannels.UPDATE_ANALYTICS_PREFERENCE, enabled);
    }

    async function updateDeleteWarning(enabled: boolean) {
        await userManager.settings.updateEditor({ shouldWarnDelete: enabled });
    }

    return (
        <div className="flex flex-col gap-8 p-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">Language</p>
                    <p className="text-foreground-onlook text-small">
                        Choose your preferred language
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {LANGUAGE_DISPLAY_NAMES[
                                locale as keyof typeof LANGUAGE_DISPLAY_NAMES
                            ] ?? 'English'}
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
                                {locale === code && <Icons.CheckCircled className="ml-auto" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">Theme</p>
                    <p className="text-foreground-onlook text-small">
                        Choose your preferred appearance
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {theme === SystemTheme.DARK && <Icons.Moon className="mr-2 h-4 w-4" />}
                            {theme === SystemTheme.LIGHT && <Icons.Sun className="mr-2 h-4 w-4" />}
                            {theme === SystemTheme.SYSTEM && (
                                <Icons.Laptop className="mr-2 h-4 w-4" />
                            )}
                            <span className="capitalize">{theme}</span>
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[150px]">
                        <DropdownMenuItem onClick={() => setTheme(SystemTheme.LIGHT)}>
                            <Icons.Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                            {theme === SystemTheme.LIGHT && (
                                <Icons.CheckCircled className="ml-auto" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(SystemTheme.DARK)}>
                            <Icons.Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                            {theme === SystemTheme.DARK && (
                                <Icons.CheckCircled className="ml-auto" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(SystemTheme.SYSTEM)}>
                            <Icons.Laptop className="mr-2 h-4 w-4" />
                            <span>System</span>
                            {theme === SystemTheme.SYSTEM && (
                                <Icons.CheckCircled className="ml-auto" />
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">Code Editor</p>
                    <p className="text-foreground-onlook text-small">
                        Choose the IDE where you open your code in
                    </p>
                </div>
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
                                    onSelect={async () => {
                                        await updateIde(item);
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
                    <p className="text-largePlus">{'Warn before delete'}</p>
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
                    <p className="text-largePlus">Analytics</p>
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
