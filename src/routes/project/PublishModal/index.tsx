import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CodeIcon, ExternalLinkIcon } from "@radix-ui/react-icons"
import { observer } from "mobx-react-lite"
import { useState } from "react"
import ReactDiffViewer from 'react-diff-viewer-continued'
import { useEditorEngine } from ".."
import { MainChannels } from "/common/constants"
import { CodeResult, TemplateNode } from "/common/models"

const PublishModal = observer(() => {
    const editorEngine = useEditorEngine();
    const [codeResult, setCodeResult] = useState<CodeResult[]>([]);

    async function onOpenChange(open: boolean) {
        if (open) {
            const res = await editorEngine.code.generateCodeDiffs();
            setCodeResult(res);
        }
    }

    function openCodeBlock(templateNode: TemplateNode) {
        editorEngine.code.viewInEditor(templateNode);
    }

    async function writeCodeBlock() {
        const res = await window.Main.invoke(MainChannels.WRITE_CODE_BLOCK, codeResult);
        // TODO: Handle result
    }

    return (
        <Dialog onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className=''><CodeIcon className="mr-2" /> Publish Code</Button>
            </DialogTrigger>
            <DialogContent className="min-w-[60vw] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Review code change</DialogTitle>
                    <DialogDescription>
                        Review and apply the changes to your codebase
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-6 max-h-96 overflow-auto">
                    {codeResult.map((item, index) => (
                        <div key={index} className="flex flex-col space-y-2">
                            <Button variant="link" className="truncate justify-start" onClick={() => openCodeBlock(item.param.templateNode)}>{item.param.templateNode.path} <ExternalLinkIcon className="ml-2" /> </Button>
                            <div className="border">
                                <ReactDiffViewer
                                    styles={{
                                        variables: {
                                            dark: {
                                                diffViewerBackground: '#000',
                                                gutterBackground: '#000',
                                                addedBackground: '#003300',
                                                removedBackground: '#330000',
                                                wordAddedBackground: '#006b0c',
                                                wordRemovedBackground: '#6b0000',
                                            }
                                        },
                                        line: {
                                            fontSize: '14px',
                                        },
                                        gutter: {
                                            fontSize: '14px',
                                        },
                                    }}
                                    useDarkTheme
                                    oldValue={item.original}
                                    newValue={item.generated}
                                    splitView={true} />
                            </div>

                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={writeCodeBlock} type="submit">Write to code</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
})
export default PublishModal