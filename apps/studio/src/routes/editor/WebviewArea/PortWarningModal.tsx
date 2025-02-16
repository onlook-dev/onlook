import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Button } from '@onlook/ui/button';

interface PortTakenModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setWebviewSrc: (url: string) => void;
    availablePort: number;
    currentPort: number;
}

export function PortWarningModal({
    open,
    onOpenChange,
    setWebviewSrc,
    availablePort,
    currentPort,
}: PortTakenModalProps) {
    const handleChangePort = () => {
        setWebviewSrc(`http://localhost:${availablePort}`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Port Conflict Detected</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="col-span-3 space-y-2">
                        <h2 className="text-red-500 font-semibold">
                            Port {currentPort} is already taken.
                        </h2>
                        <p>
                            Another process is running on <strong>localhost:{currentPort}</strong>.
                            You may need to stop that process or run your application on a different
                            port.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleChangePort}>Change port</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
