import { useEditorEngine } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircledIcon, ResetIcon, ShadowIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import ModeToggle from './ModeToggle';
import OpenCode from './OpenCode';
import ProjectBreadcrumb from './ProjectSelect';
import { Hotkey } from '/common/hotkeys';

const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();

    const UNDO_REDO_BUTTONS = [
        {
            click: () => editorEngine.action.undo(),
            hotkey: Hotkey.UNDO,
            icon: <ResetIcon className="h-3 w-3 mr-1" />,
            isDisabled: !editorEngine.history.canUndo,
        },
        {
            click: () => editorEngine.action.redo(),
            hotkey: Hotkey.REDO,
            icon: <ResetIcon className="h-3 w-3 mr-1 scale-x-[-1]" />,
            isDisabled: !editorEngine.history.canRedo,
        },
    ];

    return (
        <div className="bg-background-onlook/60 backdrop-blur-sm flex flex-row h-10 p-2 justify-center items-center">
            <div className="flex flex-row flex-grow basis-0 space-x-1 justify-start items-center">
                <ProjectBreadcrumb />
                <div className="space-x-0 hidden lg:block">
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
                </div>
                {editorEngine.history.length > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex flex-row items-center gap-2 text-xs text-foreground-onlook">
                                {editorEngine.code.isExecuting ? (
                                    <ShadowIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircledIcon className="h-3 w-3" />
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
                )}
            </div>
            <ModeToggle />
            <div className="flex space-x-2 flex-grow basis-0 justify-end">
                <OpenCode />
            </div>
        </div>
    );
});

export default EditorTopBar;
