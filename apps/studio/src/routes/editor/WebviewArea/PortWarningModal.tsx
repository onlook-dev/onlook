import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface PortTakenModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setWebviewSrc: (url: string) => void;
    availablePort: number;
    currentPort: number;
    checkPortStatus: (port: number) => Promise<boolean>;
}

export function PortWarningModal({
    open,
    onOpenChange,
    setWebviewSrc,
    availablePort,
    currentPort,
    checkPortStatus,
}: PortTakenModalProps) {
    const [showStillTaken, setShowStillTaken] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    const handleChangePort = () => {
        setWebviewSrc(`http://localhost:${availablePort}`);
        onOpenChange(false);
    };

    const handleRefresh = async () => {
        setIsFlashing(true);
        try {
            const isPortTaken = await checkPortStatus(currentPort);
            if (isPortTaken) {
                setShowStillTaken(true);
                setTimeout(() => setShowStillTaken(false), 3000);
            } else {
                setWebviewSrc(`http://localhost:${currentPort}`);
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error checking port status:', error);
        }
        setTimeout(() => setIsFlashing(false), 200);
    };

    const getMessage = () => showStillTaken 
        ? "Port is still occupied. Check your other IDE." 
        : "Port is currently in use.";
    
    const messageCharacters = useMemo(() => {
        const message = getMessage();
        return message.split('').map((label, index) => ({
            label,
            id: `port-message-${message.length}-${index}-${label}`
        }));
    }, [getMessage, showStillTaken]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-title3">
                        Port Conflict Detected
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="col-span-3 space-y-3">
                        <div className={cn(
                            "flex items-center justify-between gap-2 p-1 px-3 rounded-md border-[0.5px] transition-all duration-200",
                            showStillTaken 
                                ? "bg-amber-500/20 border-amber-400" 
                                : "bg-amber-500/10 border-amber-500"
                        )}>
                            <div className="flex items-center gap-2 justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <Icons.ExclamationTriangle className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs relative overflow-hidden">
                                        <AnimatePresence mode="popLayout">
                                            {messageCharacters.map((character) => (
                                                <motion.span
                                                    key={character.id}
                                                    layoutId={character.id}
                                                    layout="position"
                                                    className={cn(
                                                        "inline-block",
                                                        character.label === ' ' && "w-[0.4em]",
                                                        showStillTaken ? "text-amber-200" : "text-amber-400"
                                                    )}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        type: 'spring',
                                                        bounce: 0.1,
                                                        duration: 0.4,
                                                    }}
                                                >
                                                    {character.label === ' ' ? '\u00A0' : character.label}
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="gap-x-1.5 p-1 text-xs text-amber-500 hover:text-amber-300 bg-transparent hover:bg-transparent"
                                    onClick={handleRefresh}
                                >
                                    <Icons.Reload className="h-4 w-4" />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                        <p className="text-regular text-foreground/80">
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
                    <Button className="text-sm text-background" onClick={handleChangePort}>
                        Change port
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
