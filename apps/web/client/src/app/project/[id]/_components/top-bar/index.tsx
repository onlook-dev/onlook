'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { Button } from '@onlook/ui/button';
import { HotkeyLabel } from '@onlook/ui/hotkey-label';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { SettingsTabValue } from '@/components/ui/settings-modal/helpers';
import { transKeys } from '@/i18n/keys';
import { Members } from '../members';
import { BranchDisplay } from './branch';
import { ModeToggle } from './mode-toggle';
import { ProjectBreadcrumb } from './project-breadcrumb';
import { PublishButton } from './publish';

export const TopBar = observer(() => {
    const stateManager = useStateManager();
    const [isMembersPopoverOpen, setIsMembersPopoverOpen] = useState(false);
    const editorEngine = useEditorEngine();
    const t = useTranslations();

    const UNDO_REDO_BUTTONS = [
        {
            click: () => editorEngine.action.undo(),
            isDisabled: !editorEngine.history.canUndo || editorEngine.chat.isStreaming,
            hotkey: Hotkey.UNDO,
            icon: <Icons.Reset className="mr-1 h-4 w-4" />,
        },
        {
            click: () => editorEngine.action.redo(),
            isDisabled: !editorEngine.history.canRedo || editorEngine.chat.isStreaming,
            hotkey: Hotkey.REDO,
            icon: <Icons.Reset className="mr-1 h-4 w-4 scale-x-[-1]" />,
        },
    ];

    return (
        <div className="bg-background-primary/20 flex h-10 flex-row items-center justify-center p-0 backdrop-blur-md">
            <div className="flex flex-grow basis-0 flex-row items-center justify-start">
                <ProjectBreadcrumb />
                <BranchDisplay />
            </div>
            <ModeToggle />
            <div className="mr-2 flex flex-grow basis-0 items-center justify-end gap-1.5">
                <div className="group flex items-center">
                    <div
                        className={`transition-all duration-200 ${isMembersPopoverOpen ? 'mr-2' : '-mr-2 group-hover:mr-2'}`}
                    >
                        <Members onPopoverOpenChange={setIsMembersPopoverOpen} />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center">
                                <CurrentUserAvatar className="hover:border-foreground-primary size-8 cursor-pointer" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            <p>Profile</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <motion.div
                    className="-mr-1 hidden space-x-0 lg:block"
                    layout
                    transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        delay: 0,
                    }}
                >
                    {UNDO_REDO_BUTTONS.map(({ click, hotkey, icon, isDisabled }) => (
                        <Tooltip key={hotkey.description}>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8"
                                        onClick={click}
                                        disabled={isDisabled}
                                    >
                                        {icon}
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" hideArrow className="mt-2">
                                <HotkeyLabel hotkey={hotkey} />
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </motion.div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8"
                            onClick={() => {
                                stateManager.settingsTab = SettingsTabValue.VERSIONS;
                                stateManager.isSettingsModalOpen = true;
                            }}
                        >
                            <Icons.CounterClockwiseClock className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        {t(transKeys.editor.toolbar.versionHistory)}
                    </TooltipContent>
                </Tooltip>
                <PublishButton />
            </div>
        </div>
    );
});
