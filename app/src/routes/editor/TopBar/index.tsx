import { useEditorEngine } from '@/components/Context/Editor';
import { Button } from '@/components/ui/button';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResetIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import ModeToggle from './ModeToggle';
import OpenCode from './OpenCode';
import PublishModal from './PublishModal';
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
        <div className="bg-bg/60 backdrop-blur-sm flex flex-row h-10 p-2 justify-center items-center">
            <div className="flex flex-row flex-grow basis-0 space-x-1 justify-start items-center">
                <OpenCode />
                <div className="space-x-0">
                    {UNDO_REDO_BUTTONS.map(({ click, hotkey, icon, isDisabled }) => (
                        <Tooltip key={hotkey.description}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8"
                                    onClick={click}
                                    disabled={isDisabled}
                                >
                                    {icon}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <HotKeyLabel hotkey={hotkey} />
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
                <p className="text-xs text-text">
                    {editorEngine.history.length === 0
                        ? ''
                        : `${editorEngine.history.length} change${editorEngine.history.length > 1 ? 's' : ''}`}
                </p>
            </div>
            <ModeToggle />
            <div className="flex space-x-2 flex-grow basis-0 justify-end">
                <PublishModal />
            </div>
        </div>
    );
});

export default EditorTopBar;
