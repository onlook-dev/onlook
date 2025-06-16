import { useUserManager } from '@/components/store/user';
import type { Language } from '@onlook/constants';
import { LANGUAGE_DISPLAY_NAMES } from '@onlook/constants';
import { SystemTheme } from '@onlook/models';
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

    const shouldWarnDelete = userManager.settings.settings?.editor?.shouldWarnDelete ?? true;

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
        </div>
    );
});