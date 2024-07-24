import { Button } from '@/components/ui/button';
import { ResetIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '..';
import PublishModal from '../PublishModal';
import SharePopover from '../SharePopover';
import ModeToggle from './ModeToggle';
import { decodeTemplateNode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();
    const [selectedNode, setSelectedNode] = useState<TemplateNode | null>(null);

    useEffect(() => {
        if (editorEngine.state.selected.length > 0) {
            const dataOnlook = editorEngine.state.selected[0].dataOnlookId;
            if (dataOnlook) {
                const selectedNode = decodeTemplateNode(dataOnlook);
                setSelectedNode(selectedNode);
            } else {
                setSelectedNode(null);
            }
        }
    }, [editorEngine.state.selected]);

    function openCodeBlock() {
        if (selectedNode) {
            editorEngine.code.viewSource(selectedNode);
        }
    }

    function onUndoClick() {
        editorEngine.undo();
    }

    function onRedoClick() {
        editorEngine.redo();
    }

    return (
        <div className="flex flex-row h-10 p-2 justify-center items-center border-b border-b-border">
            <div className="flex-grow basis-0 space-x-1">
                <Button
                    disabled={selectedNode === null}
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={openCodeBlock}
                >
                    <div className="text-white h-3 w-3 mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256">
                            <g fill="#ffffff">
                                <g transform="scale(10.66667,10.66667)">
                                    <path d="M22,4.94v14.09c0,0 -2.69,1.3 -4,1.93v-17.93c1.42,0.68 4,1.91 4,1.91zM4.65,13.35l2.16,1.97c-0.97,0.73 -1.77,1.34 -2.26,1.7l-2.11,-1.65zM16,3.02v5.32c0,0 -1.36,1.04 -3.17,2.41c-0.94,-0.72 -1.94,-1.48 -2.9,-2.2l5.94,-5.41zM16,20.983v-5.323c0,0 -9.202,-6.994 -11.453,-8.681l-2.103,1.652z"></path>
                                </g>
                            </g>
                        </svg>
                    </div>
                    Open in VSCode
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className=""
                    onClick={onUndoClick}
                    disabled={!editorEngine.history.canUndo}
                >
                    <ResetIcon className="h-3 w-3 mr-1" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className=""
                    onClick={onRedoClick}
                    disabled={!editorEngine.history.canRedo}
                >
                    <ResetIcon className="h-3 w-3 mr-1 scale-x-[-1]" />
                </Button>
            </div>
            <ModeToggle />
            <div className="flex space-x-2 flex-grow basis-0 justify-end">
                <SharePopover />
                <PublishModal />
            </div>
        </div>
    );
});

export default EditorTopBar;
