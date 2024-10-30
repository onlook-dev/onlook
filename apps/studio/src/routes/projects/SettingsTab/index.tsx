import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { ProjectTabs } from '..';
import { getRandomSettingsMessage } from '../helpers';
import { MainChannels } from '/common/constants';
import { IDE, IdeType } from '/common/ide';
import type { UserSettings } from '/common/models/settings';

const SettingsTab = observer(({ setCurrentTab }: { setCurrentTab: (tab: ProjectTabs) => void }) => {
    const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
    const [ide, setIde] = useState<IDE>(IDE.VS_CODE);
    const [shouldWarnDelete, setShouldWarnDelete] = useState(true);

    const IDEIcon = Icons[ide.icon];

    useEffect(() => {
        window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            setIde(IDE.fromType(settings.ideType || IdeType.VS_CODE));
            setIsAnalyticsEnabled(settings.enableAnalytics || false);
            setShouldWarnDelete(settings.shouldWarnDelete ?? true);
        });
    }, []);

    function updateIde(ide: IDE) {
        window.api.invoke(MainChannels.UPDATE_USER_SETTINGS, { ideType: ide.type });
        setIde(ide);
    }

    function updateAnalytics(enabled: boolean) {
        window.api.send(MainChannels.UPDATE_ANALYTICS_PREFERENCE, enabled);
        setIsAnalyticsEnabled(enabled);
    }

    function updateDeleteWarning(enabled: boolean) {
        window.api.invoke(MainChannels.UPDATE_USER_SETTINGS, { shouldWarnDelete: enabled });
        setShouldWarnDelete(enabled);
    }

    function openExternalLink(url: string) {
        window.api.invoke(MainChannels.OPEN_EXTERNAL_WINDOW, url);
    }

    function handleBackButtonClick() {
        setCurrentTab(ProjectTabs.PROJECTS);
    }

    return (
        <div className="w-[800px] h-full flex mt-28 flex-col gap-16 md:flex-col px-12">
            <div className="flex-row flex justify-between">
                <div className="h-[fit-content] flex flex-col gap-5 ">
                    <h1 className="leading-none text-title1">{'Settings'}</h1>
                    <p className="text-foreground-onlook text-regular">
                        {getRandomSettingsMessage()}
                    </p>
                </div>
                <div className="h-fit w-fit flex group">
                    <Button
                        variant="secondary"
                        className="w-fit h-fit flex flex-col gap-1 text-foreground-secondary hover:text-foreground-active"
                        onClick={handleBackButtonClick}
                    >
                        <Icons.CrossL className="w-4 h-4 cursor-pointer" />
                        <p className="text-microPlus">Close</p>
                    </Button>
                </div>
            </div>
            <div className="w-full h-full flex flex-col gap-12">
                <div className="flex flex-col gap-8">
                    <h3 className="text-title3">{'Editor'}</h3>
                    <div className="flex justify-between items-center">
                        <p className="text-foreground-onlook text-largePlus">
                            {'Default Code Editor'}
                        </p>
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
                                            {ide === item && (
                                                <Icons.CheckCircled className="ml-auto" />
                                            )}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="w-full h-[fit-content] flex justify-between items-center gap-4">
                        <div className="w-full h-[fit-content] flex flex-col gap-2">
                            <p className="w-[fit-content] h-[fit-content] text-foreground-onlook text-largePlus">
                                {'Warn before delete'}
                            </p>
                            <p className="w-[fit-content] h-[fit-content] text-foreground-onlook text-small">
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
                    <div className="w-full h-[fit-content] flex justify-between items-center gap-4">
                        <div className="w-full h-[fit-content] flex flex-col gap-2">
                            <p className="w-[fit-content] h-[fit-content] text-foreground-onlook text-largePlus">
                                {'Analytics'}
                            </p>
                            <p className="w-[fit-content] h-[fit-content] text-foreground-onlook text-small">
                                {
                                    'This helps our small team of two know what we need to improve with the product.'
                                }
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
                <div className="w-full h-[0.5px] bg-gray-600"></div>
                <div className="w-full h-[fit-content] flex flex-col gap-8">
                    <h3 className="w-full h-[fit-content] text-title3">Danger Zone</h3>
                    <div className="w-full h-[fit-content] flex justify-between items-center gap-4">
                        <div className="w-full h-[fit-content] flex flex-col gap-2">
                            <p className="w-[fit-content] h-[fit-content] text-foreground-onlook text-largePlus">
                                {'Delete Account'}
                            </p>
                            <p className="w-[fit-content] h-[fit-content] text-foreground-onlook text-small">
                                {
                                    ' We’ll delete all of your actions, your account, and connections to your projects, but we won’t delete your React projects from your computer.'
                                }
                            </p>
                        </div>
                        <Button variant="destructive" className="text-smallPlus">
                            {' Delete Account'}
                        </Button>
                    </div>
                </div>
                <div className="w-full h-[0.5px] bg-gray-600"></div>
                <div className="w-full h-[fit-content] flex flex-row gap-1 text-gray-400 text-micro">
                    <p>{`Onlook Studio Version ${window.env.APP_VERSION} • `}</p>
                    <button
                        onClick={() => openExternalLink('https://onlook.dev/privacy-policy')}
                        className="text-gray-400 hover:text-gray-200 underline transition-colors duration-200"
                    >
                        Privacy Policy
                    </button>
                    <p> {'and'} </p>
                    <button
                        onClick={() => openExternalLink('https://onlook.dev/terms-of-service')}
                        className="text-gray-400 hover:text-gray-200 underline transition-colors duration-200"
                    >
                        Terms of Service
                    </button>
                </div>
            </div>
        </div>
    );
});

export default SettingsTab;
