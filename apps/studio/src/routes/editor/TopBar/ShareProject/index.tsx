import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@onlook/ui/utils';

const ShareProject = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLinkCreated, setIsLinkCreated] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText('http://localhost:3000');
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

    return (
        <>
            <Button
                variant="default"
                className="flex items-center border text-smallPlus justify-center shadow-sm bg-background hover:bg-background-onlook hover:text-accent-foreground disabled:text-foreground-onlook h-8 px-2.5 rounded-md hover:text-foreground-active/90 transition-all duration-300 ease-in-out"
                onClick={() => setIsOpen(true)}
            >
                <Icons.Globe className="mr-2 h-4 w-4" />
                Share
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background border border-background-tertiary">
                    <DialogHeader>
                        <DialogTitle className="text-foreground-primary text-title3">
                            {isLinkCreated ? 'Public link' : 'Share public link'}
                        </DialogTitle>
                    </DialogHeader>

                    <AnimatePresence mode="wait">
                        {!isLinkCreated ? (
                            <motion.div
                                key="initial"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                <p className="text-regular text-foreground-secondary">
                                    Share your app with the world and update it at any time in
                                    Onlook.
                                </p>
                                <Button onClick={() => setIsLinkCreated(true)} className="w-full">
                                    Create link
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                <p className="text-regular text-foreground-secondary">
                                    Your app is now public – What you see is what your users see.
                                    You can unpublish or update it at any time here.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center bg-background rounded-md border border-background-tertiary h-9">
                                            <span className="text-sm text-foreground-secondary truncate px-2">
                                                https://example.dev/share/...
                                            </span>
                                        </div>
                                        <Button
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
                                            onClick={() => {
                                                /* handle update */
                                            }}
                                            disabled={!hasChanges}
                                            className={cn(
                                                'flex-1',
                                                hasChanges
                                                    ? 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border-teal-500'
                                                    : 'cursor-not-allowed',
                                            )}
                                        >
                                            Update
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ShareProject;
