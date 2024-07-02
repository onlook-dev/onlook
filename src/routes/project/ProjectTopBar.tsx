import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { TemplateNode } from '@/lib/models';
import { CodeIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '.';
import SharePopover from './SharePopver';

const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();
    const [selectedNode, setSelectedNode] = useState<TemplateNode | null>(null);

    useEffect(() => {
        if (editorEngine.state.selected.length > 0) {
            const dataOnlook = editorEngine.state.selected[0].dataOnlookId;
            if (dataOnlook) {
                const selectedNode = editorEngine.code.decompress(dataOnlook)
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

    async function writeStyleChanges() {
        await editorEngine.code.writeStyleToCode();
    }

    return (
        <div className='flex flex-row h-10 p-2 justify-center items-center border-b border-b-stone-800'>
            <div className='flex-grow basis-0'>
                <Button disabled={selectedNode === null} variant='outline' size="sm" className='' onClick={openCodeBlock}><CodeIcon className='mr-2' /> Code block</Button>
            </div>
            <Label className='my-auto font-normal'>Your Project</Label>
            <div className='flex space-x-2 flex-grow basis-0 justify-end'>
                <SharePopover />
                <Button size="sm" className='' onClick={writeStyleChanges}>Apply changes</Button>
            </div>
        </div>
    );
});

export default EditorTopBar;
