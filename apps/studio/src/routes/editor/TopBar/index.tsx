import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import ModeToggle from './ModeToggle';
import ProjectBreadcrumb from './ProjectSelect';
import Publish from './Publish';
import { Hotkey } from '/common/hotkeys';

const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();

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
                <div className="flex flex-row items-center gap-2 layout">
                    <AnimatePresence mode="sync">
                        {editorEngine.history.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25,
                                }}
                                layout
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-row items-center gap-2 mr-1 text-xs text-foreground-onlook">
                                            {editorEngine.code.isExecuting ? (
                                                <Icons.Shadow className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Icons.CheckCircled className="h-4 w-4" />
                                            )}
                                            <p>{`${editorEngine.history.length} change${editorEngine.history.length > 1 ? 's' : ''}`}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p>
                                            {editorEngine.code.isExecuting
                                                ? 'Writing code'
                                                : 'Edits written to code'}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                </div>
                <Publish />
            </div>
        </div>
    );
});

export default EditorTopBar;
