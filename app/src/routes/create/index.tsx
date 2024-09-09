import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileIcon, FilePlusIcon } from '@radix-ui/react-icons';
export default function CreateModal() {
    return (
        <Dialog open>
            <DialogContent className="bg-bg-toolbar-base w-[500px] h-[285px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-normal"> Get Started </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <Card className="border border-border bg-bg-primary hover:bg-blue-900 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-6 transition">
                        <div className="rounded-full p-2 bg-gray-400">
                            <FileIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-medium text-text-active">
                            {' '}
                            Load existing project{' '}
                        </h3>
                        <p className="text-xs text-text">Work on your React UI</p>
                    </Card>
                    <Card className="border border-blue-800 bg-blue-900/50 hover:bg-blue-900 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-6 transition">
                        <div className="rounded-full p-2 bg-blue-500">
                            <FilePlusIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-medium"> New Onlook project </h3>
                        <p className="text-xs text-blue-200"> Start a React App </p>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
