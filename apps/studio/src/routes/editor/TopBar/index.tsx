import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import ModeToggle from './ModeToggle';
import ProjectBreadcrumb from './ProjectSelect';
import Publish from './Publish';
import { Hotkey } from '/common/hotkeys';

export const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();

    const UNDO_REDO_BUTTONS = [
        {
            click: () => editorEngine.action.undo(),
            hotkey: Hotkey.UNDO,
            icon: <Icons.Reset className="h-4 w-4 mr-1" />,
            isDisabled: !editorEngine.history.canUndo,
        },
        {
            click: () => editorEngine.action.redo(),
            hotkey: Hotkey.REDO,
            icon: <Icons.Reset className="h-4 w-4 mr-1 scale-x-[-1]" />,
            isDisabled: !editorEngine.history.canRedo,
        },
    ];

    return (
        <div className="bg-background-onlook/60 backdrop-blur-sm flex flex-row h-10 p-2 justify-center items-center">
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
                                    <HotKeyLabel hotkey={hotkey} />
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
                                    editorEngine.settingsTab = SettingsTabValue.VERSIONS;
                                    editorEngine.isSettingsOpen = true;
                                }}
                            >
                                <Icons.CounterClockwiseClock className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {t('editor.toolbar.versionHistory')}
                        </TooltipContent>
                    </Tooltip>
                </div>
                <Publish />
            </div>
        </div>
    );
});
