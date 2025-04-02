"use client"

// import { useEditorEngine } from '@/components/Context';
// import { SettingsTabValue } from '@/lib/models';
// import ModeToggle from './ModeToggle';
// import ProjectBreadcrumb from './ProjectSelect';
// import Publish from './Publish';
// import { Hotkey } from '/common/hotkeys';
import { Button } from '@onlook/ui-v4/button';
import { Icons } from '@onlook/ui-v4/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui-v4/tooltip';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

export const EditorTopBar = () => {
    // const editorEngine = useEditorEngine();
    const t = useTranslations();

    const UNDO_REDO_BUTTONS = [
        // {
        //     click: () => editorEngine.action.undo(),
        //     hotkey: Hotkey.UNDO,
        //     icon: <Icons.Reset className="h-4 w-4 mr-1" />,
        //     isDisabled: !editorEngine.history.canUndo,
        // },
        // {
        //     click: () => editorEngine.action.redo(),
        //     hotkey: Hotkey.REDO,
        //     icon: <Icons.Reset className="h-4 w-4 mr-1 scale-x-[-1]" />,
        //     isDisabled: !editorEngine.history.canRedo,
        // },
    ];

    return (
        <div className="bg-background-onlook/60 backdrop-blur-sm flex flex-row h-10 p-2 justify-center items-center">
            <div className="flex flex-row flex-grow basis-0 space-x-1 justify-start items-center">
                {/* <ProjectBreadcrumb /> */}
            </div>
            {/* <ModeToggle /> */}
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
                        {/* {UNDO_REDO_BUTTONS.map(({ click, hotkey, icon, isDisabled }) => (
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
                        ))} */}
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
                        <TooltipContent side="bottom">
                            {t('editor.toolbar.versionHistory')}
                        </TooltipContent>
                    </Tooltip>
                </div>
                {/* <Publish /> */}
            </div>
        </div>
    );
};
