import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';

const PortWarningModal = observer(
    ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
        const projectsManager = useProjectsManager();
        const editorEngine = useEditorEngine();
        const portManager = projectsManager.runner?.port;
        const [showStillTaken, setShowStillTaken] = useState(false);

        if (!portManager) {
            console.error('Port manager not found');
            return null;
        }

        useEffect(() => {
            portManager.listenForPortChanges();
            return () => portManager.clearPortCheckInterval();
        }, [portManager]);

        const handleChangePort = () => {
            editorEngine.settingsTab = SettingsTabValue.PROJECT;
            onOpenChange(false);
            editorEngine.isSettingsOpen = true;
        };

        const getMessage = () =>
            showStillTaken
                ? `Port ${portManager.currentPort} is still occupied. Check your other IDE.`
                : `Port ${portManager.currentPort} is currently in use.`;

        const handleRefresh = async () => {
            try {
                await portManager.checkPort();
                if (!portManager.isPortAvailable) {
                    setShowStillTaken(true);
                    setTimeout(() => setShowStillTaken(false), 3000);
                }
            } catch (error) {
                console.error('Error checking port status:', error);
            }
        };

        const messageCharacters = useMemo(() => {
            const message = getMessage();
            return message.split('').map((label, index) => ({
                label,
                id: `port-message-${message.length}-${index}-${label}`,
            }));
        }, [getMessage, showStillTaken]);

        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-title3">Port Conflict Detected</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="col-span-3 space-y-3">
                            <div
                                className={cn(
                                    'flex items-center justify-between gap-2 p-1 px-3 rounded-md border-[0.5px] transition-all duration-200',
                                    showStillTaken
                                        ? 'bg-amber-500/20 border-amber-400'
                                        : 'bg-amber-500/10 border-amber-500',
                                )}
                            >
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
                                                            'inline-block',
                                                            character.label === ' ' && 'w-[0.4em]',
                                                            showStillTaken
                                                                ? 'text-amber-200'
                                                                : 'text-amber-400',
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
                                                        {character.label === ' '
                                                            ? '\u00A0'
                                                            : character.label}
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
                                Another process is running on{' '}
                                <strong>localhost:{portManager.currentPort}</strong>. You may need
                                to stop that process or run your application on a different port.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            className="mr-auto hidden"
                            onClick={handleChangePort}
                        >
                            Update port
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            I understand
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    },
);

export default PortWarningModal;
