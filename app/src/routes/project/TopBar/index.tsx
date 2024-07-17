import { Button } from '@/components/ui/button';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '..';
import PublishModal from '../PublishModal';
import SharePopover from '../SharePopver';
import ModeToggle from './ModeToggle';
import { TemplateNode } from '/common/models';

const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();
    const [selectedNode, setSelectedNode] = useState<TemplateNode | null>(null);

    useEffect(() => {
        if (editorEngine.state.selected.length > 0) {
            const dataOnlook = editorEngine.state.selected[0].dataOnlookId;
            if (dataOnlook) {
                const selectedNode = editorEngine.code.decompress(dataOnlook);
                setSelectedNode(selectedNode);
            } else {
                setSelectedNode(null);
            }
        }
    }, [editorEngine.state.selected]);

    function openCodeBlock() {
        if (selectedNode) {
            editorEngine.code.viewInEditor(selectedNode);
        }
    }

    function onUndoClick() {
        editorEngine.history.undo();
    }

    return (
        <div className="flex flex-row h-10 p-2 justify-center items-center border-b border-b-stone-800">
            <div className="flex-grow basis-0">
                <Button
                    disabled={selectedNode === null}
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={openCodeBlock}
                >
                    Open in Code Editor
                </Button>
                <Button variant="outline" size="sm" className="" onClick={onUndoClick}>
                    Undo
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
