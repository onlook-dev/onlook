import CursorIcon from '@/assets/cursor.svg';
import VsCodeIcon from '@/assets/vscode.svg';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

export function SettingsTab() {
    const [analyticsActive, setAnalyticsActive] = useState(false); // State for analytics

    //   function updateIde(ide: IDE) {
    //       window.api.invoke(MainChannels.UPDATE_USER_SETTINGS, { ideType: ide.type });
    //       setIde(ide);
    //   }

    return (
        <div
            className={
                'w-full mt-20 px-8 flex items-center justify-center relative overflow-hidden'
            }
        >
            <div className="w-full max-w-[800px] h-full flex flex-row gap-16">
                <div className="h-[fit-content] w-fill min-w-[180px] flex flex-col gap-5 ">
                    <h1 className="leading-none text-title1">Settings</h1>
                    <p className="text-text text-regular">{openingMessage}</p>
                </div>
                <div className="w-full h-full flex flex-col gap-12">
                    <div className="flex flex-col gap-8">
                        <h3 className="text-title3">Editor</h3>
                        <div className="flex justify-between items-center">
                            <p className="text-text text-largePlus">Default Code Editor</p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="min-w-[150px]">
                                        <span className="flex flex-row items-center justify-center text-default h-3 w-[fit-content] mr-2">
                                            <img src={VsCodeIcon} alt="VSCode Icon" />
                                        </span>
                                        <span>VSCode</span>
                                        <ChevronDownIcon className="ml-auto" />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent>
                                    <DropdownMenuItem>
                                        <span className="text-default h-3 w-3 mr-2">
                                            <img src={VsCodeIcon} alt="VSCode Icon" />
                                        </span>
                                        <span>VSCode</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <span className="text-default h-3 w-3 mr-2">
                                            <img src={CursorIcon} alt="Cursor Icon" />
                                        </span>
                                        <span>Cursor</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="w-full h-[fit-content] flex justify-between items-center gap-4">
                            <div className="w-full h-[fit-content] flex flex-col gap-2">
                                <p className="w-[fit-content] h-[fit-content] text-text text-largePlus">
                                    Analytics
                                </p>
                                <p className="w-[fit-content] h-[fit-content] text-text text-small">
                                    This helps our small team of two know what we need to improve
                                    with the product.
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="min-w-[150px]">
                                        {analyticsActive ? 'On' : 'Off'}
                                        <ChevronDownIcon className="ml-auto" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setAnalyticsActive(true)}>
                                        Analytics On
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAnalyticsActive(false)}>
                                        Analytics Off
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
                                    Delete Account
                                </p>
                                <p className="w-[fit-content] h-[fit-content] text-text text-small">
                                    We’ll delete all of your actions, your account, and connections
                                    to your projects, but we won’t delete your React projects from
                                    your computer.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                className="border border-red-500 text-red-200 hover:bg-red-700 hover:text-red-100 hover:border-red-300"
                            >
                                Delete Account
                            </Button>
                        </div>
                    </div>
                    <div className="w-full h-[0.5px] bg-gray-400"></div>
                    <div className="w-full h-[fit-content] flex flex-row gap-1 text-gray-600 text-micro">
                        <p>Onlook Studio Version 1.4 • </p>
                        <p>
                            <a
                                href="/privacy-policy"
                                className="text-gray-600 hover:text-gray-900 underline transition-colors duration-200"
                            >
                                Privacy Policy
                            </a>
                        </p>
                        <p> and </p>
                        <p>
                            <a
                                href="/terms-of-service"
                                className="text-gray-600 hover:text-gray-900 underline transition-colors duration-200"
                            >
                                Terms of Service
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const messages = [
    'Set some dials and knobs and stuff',
    'Fine-tune how you want to build',
    'Swap out your default code editor if you dare',
    "You shouldn't be worried about this stuff, yet here you are",
    'Mostly a formality',
    "What's this button do?",
    'Customize how you want to build',
    'Thanks for stopping by the Settings page',
    'This is where the good stuff is',
    'Open 24 hours, 7 days a week',
    '*beep boop*',
    "Welcome. We've been expecting you.",
];

const openingMessage = messages[Math.floor(Math.random() * messages.length)];
