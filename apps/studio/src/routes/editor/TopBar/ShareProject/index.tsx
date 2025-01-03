import { useProjectsManager, useUserManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

const ShareProject = observer(() => {
    const projectsManager = useProjectsManager();
    const userManager = useUserManager();
    const hosting = projectsManager.hosting;
    const state = hosting?.state;
    const endpoint = state?.env?.endpoint ? `https://${state?.env?.endpoint}` : undefined;

    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyUrl = async () => {
        if (!endpoint) {
            console.error('No endpoint found');
            return;
        }
        await navigator.clipboard.writeText(endpoint);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const copyTextCharacters = useMemo(() => {
        const text = isCopied ? 'Copied!' : 'Copy link';
        return text.split('').map((ch, index) => ({
            id: `copytext_${ch}${index}`,
            label: ch === ' ' ? '\u00A0' : ch,
        }));
    }, [isCopied]);

    const createLink = async () => {
        if (!hosting) {
            console.error('Hosting is not available');
            return;
        }
        if (!userManager.user) {
            console.error('User is not available');
            return;
        }

        hosting.createEnv(userManager.user);
    };

    const publish = async () => {
        if (!hosting) {
            console.error('Hosting is not available');
            return;
        }

        hosting.publish();
    };

    const renderHeader = () => {
        if (state?.env) {
            return 'Public link';
        }
        return 'Share public link';
    };

    const renderNoEnv = () => {
        return (
            <motion.div
                key="initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
            >
                <p className="text-regular text-foreground-secondary">
                    Share your app with the world and update it at any time in Onlook.
                </p>
                <Button onClick={createLink} className="w-full">
                    Create link
                </Button>
            </motion.div>
        );
    };

    const renderLink = () => {
        return (
            <div className="flex items-center gap-2">
                <input
                    className="flex-1 flex items-center bg-background rounded-md border border-background-tertiary h-9 text-sm text-foreground-secondary px-2 "
                    value={endpoint}
                    readOnly
                />
                <Button
                    disabled={!endpoint}
                    variant="outline"
                    onClick={handleCopyUrl}
                    className="whitespace-nowrap flex items-center gap-2 w-[110px] justify-center h-9"
                >
                    <AnimatePresence mode="wait">
                        {isCopied ? (
                            <motion.div
                                key="check"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="text-teal-500"
                            >
                                <Icons.Check className="h-4 w-4" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Icons.Copy className="h-4 w-4" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <span className="text-smallPlus">
                        <AnimatePresence mode="popLayout">
                            {copyTextCharacters.map((character) => (
                                <motion.span
                                    key={character.id}
                                    layoutId={character.id}
                                    layout="position"
                                    className="inline-block"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        type: 'spring',
                                        bounce: 0.1,
                                        duration: 0.4,
                                    }}
                                >
                                    {character.label}
                                </motion.span>
                            ))}
                        </AnimatePresence>
                    </span>
                </Button>
            </div>
        );
    };

    const renderUnpublish = () => {
        return (
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        /* handle unpublish */
                    }}
                    className="flex-1 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive-foreground"
                >
                    Unpublish
                </Button>
                <Button
                    variant="outline"
                    onClick={publish}
                    className={cn(
                        'flex-1',
                        hosting
                            ? 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border-teal-500'
                            : 'cursor-not-allowed',
                    )}
                >
                    Update
                </Button>
            </div>
        );
    };

    const renderDialogButton = () => {
        return (
            <Button
                variant="default"
                className="flex items-center border border-input text-smallPlus justify-center shadow-sm bg-background hover:bg-background-onlook hover:text-accent-foreground disabled:text-foreground-onlook h-8 px-2.5 rounded-md hover:text-foreground-active/90 transition-all duration-300 ease-in-out"
                onClick={() => setIsOpen(true)}
            >
                <Icons.Globe className="mr-2 h-4 w-4" />
                Share
            </Button>
        );
    };

    const renderEnvFound = () => {
        return (
            <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
            >
                <p className="text-regular text-foreground-secondary">
                    Your app is now public – What you see is what your users see. You can unpublish
                    or update it at any time here.
                </p>

                <div className="space-y-4">
                    {renderLink()}
                    {renderUnpublish()}
                </div>
            </motion.div>
        );
    };

    return (
        <>
            {renderDialogButton()}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background border border-background-tertiary">
                    <DialogHeader>
                        <DialogTitle className="text-foreground-primary text-title3">
                            {renderHeader()}
                        </DialogTitle>
                    </DialogHeader>
                    <AnimatePresence mode="wait">
                        {!state?.env ? renderNoEnv() : renderEnvFound()}
                    </AnimatePresence>
                </DialogContent>
            </Dialog>
        </>
    );
});

export default ShareProject;
