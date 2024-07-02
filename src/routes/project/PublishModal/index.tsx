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
import { Label } from "@/components/ui/label"
import { CodeIcon } from "@radix-ui/react-icons"
import { observer } from "mobx-react-lite"
import { useState } from "react"
import { useEditorEngine } from ".."
import { CodeResult } from "/common/models"

const PublishModal = observer(() => {
    const editorEngine = useEditorEngine();
    const [codeResult, setCodeResult] = useState<CodeResult[]>([]);

    async function onOpenChange(open: boolean) {
        if (open && codeResult.length === 0) {
            const res = await editorEngine.code.writeStyleToCode();
            setCodeResult(res);
        }
    }

    return (
        <Dialog defaultOpen={true} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className=''><CodeIcon className="mr-2" /> Publish Code</Button>
            </DialogTrigger>
            <DialogContent >
                <DialogHeader>
                    <DialogTitle>Review code change</DialogTitle>
                    <DialogDescription>
                        Review and apply the changes to your codebase
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4">
                    {codeResult.map((item, index) => (
                        <div key={index} className="flex flex-col space-y-2">
                            <Label>{item.param.selector}</Label>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
})
export default PublishModal