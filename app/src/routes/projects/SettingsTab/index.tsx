import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckCircledIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { getRandomSettingsMessage } from '../helpers';
import { MainChannels } from '/common/constants';
import { IDE, IdeType } from '/common/ide';
import { UserSettings } from '/common/models/settings';

export default function SettingsTab() {
    const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
    const [ide, setIde] = useState<IDE>(IDE.VS_CODE);

    useEffect(() => {
        window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            setIde(IDE.fromType(settings.ideType || IdeType.VS_CODE));
            setIsAnalyticsEnabled(settings.enableAnalytics || false);
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

    function openExternalLink(url: string) {
        window.api.invoke(MainChannels.OPEN_EXTERNAL_WINDOW, url);
    }

    return (
        <div className="w-[800px] mt-28 flex flex-row gap-16">
            <div className="h-[fit-content] w-[240px] flex flex-col gap-5 ">
                <h1 className="leading-none text-title1">{'Settings'}</h1>
                <p className="text-text text-regular">{getRandomSettingsMessage()}</p>
            </div>
            <div className="w-full h-full flex flex-col gap-12">
                <div className="flex flex-col gap-8">
                    <h3 className="text-title3">{'Editor'}</h3>
                    <div className="flex justify-between items-center">
                        <p className="text-text text-largePlus">{'Default Code Editor'}</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="min-w-[150px]">
                                    <span className="flex flex-row items-center justify-center text-default h-3 w-[fit-content] mr-2">
                                        <img src={ide.icon} alt={`${ide} Icon`} />
                                    </span>
                                    <span className="smallPlus">{ide.displayName}</span>
                                    <ChevronDownIcon className="ml-auto" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {IDE.getAll().map((item) => (
                                    <DropdownMenuItem
                                        key={item.displayName}
                                        className="text-smallPlus min-w-[140px]"
                                        onSelect={() => {
                                            updateIde(item);
                                        }}
                                    >
                                        <span className="text-default h-3 w-3 mr-2">
                                            <img src={item.icon} alt={`${item} Icon`} />
                                        </span>
                                        <span>{item.displayName}</span>
                                        {ide === item && <CheckCircledIcon className="ml-auto" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="w-full h-[fit-content] flex justify-between items-center gap-4">
                        <div className="w-full h-[fit-content] flex flex-col gap-2">
                            <p className="w-[fit-content] h-[fit-content] text-text text-largePlus">
                                {'Analytics'}
                            </p>
                            <p className="w-[fit-content] h-[fit-content] text-text text-small">
                                {
                                    'This helps our small team of two know what we need to improve with the product.'
                                }
                            </p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="text-smallPlus min-w-[150px]">
                                    {isAnalyticsEnabled ? 'On' : 'Off'}
                                    <ChevronDownIcon className="ml-auto" />
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
                <div className="w-full h-[0.5px] bg-gray-400"></div>
                <div className="w-full h-[fit-content] flex flex-col gap-8">
                    <h3 className="w-full h-[fit-content] text-title3">Danger Zone</h3>
                    <div className="w-full h-[fit-content] flex justify-between items-center gap-4">
                        <div className="w-full h-[fit-content] flex flex-col gap-2">
                            <p className="w-[fit-content] h-[fit-content] text-text text-largePlus">
                                {'Delete Account'}
                            </p>
                            <p className="w-[fit-content] h-[fit-content] text-text text-small">
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
                <div className="w-full h-[0.5px] bg-gray-400"></div>
                <div className="w-full h-[fit-content] flex flex-row gap-1 text-gray-600 text-micro">
                    <p>{`Onlook Studio Version ${window.env.APP_VERSION} • `}</p>
                    <button
                        onClick={() => openExternalLink('https://onlook.dev/privacy-policy')}
                        className="text-gray-600 hover:text-gray-900 underline transition-colors duration-200"
                    >
                        Privacy Policy
                    </button>
                    <p> {'and'} </p>
                    <button
                        onClick={() => openExternalLink('https://onlook.dev/terms-of-service')}
                        className="text-gray-600 hover:text-gray-900 underline transition-colors duration-200"
                    >
                        Terms of Service
                    </button>
                </div>
            </div>
        </div>
    );
}
