'use client';

import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { HotkeyLabel } from '@onlook/ui/hotkey-label';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { ModeToggle } from './mode-toggle';
import { ProjectBreadcrumb } from './project-breadcrumb';

export const TopBar = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();

    const UNDO_REDO_BUTTONS = [
        {
            click: () => editorEngine.action.undo(),
            isDisabled: !editorEngine.history.canUndo,
            hotkey: Hotkey.UNDO,
            icon: <Icons.Reset className="h-4 w-4 mr-1" />,
        },
        {
            click: () => editorEngine.action.redo(),
            isDisabled: !editorEngine.history.canRedo,
            hotkey: Hotkey.REDO,
            icon: <Icons.Reset className="h-4 w-4 mr-1 scale-x-[-1]" />,
        },
    ];

    return (
        <div className="bg-background-primary/20 backdrop-blur-md flex flex-row h-10 p-0 justify-center items-center">
            <div className="flex flex-row flex-grow basis-0 space-x-1 justify-start items-center">
                <ProjectBreadcrumb />
            </div>
            <ModeToggle />
            <div className="flex flex-grow basis-0 justify-end items-center gap-2">
                <div className="flex flex-row items-center layout">
                    <motion.div
                        className="space-x-0 hidden lg:block"
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
                                <TooltipContent side="bottom">
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
                                // onClick={() => {
                                //     editorEngine.settingsTab = SettingsTabValue.VERSIONS;
                                //     editorEngine.isSettingsOpen = true;
                                // }}
                            >
                                <Icons.CounterClockwiseClock className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        {/* Hide version history for now */}
                        {/* <TooltipContent side="bottom">
                            {t('editor.toolbar.versionHistory')}
                        </TooltipContent> */}
                    </Tooltip>
                </div>
            </div>
        </div>
    );
});
