import { useEditorEngine, useProjectsManager, useUserManager } from '@/components/Context';
import { HostingStateMessages, HostingStatus, type CustomDomain } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { Checkbox } from '@onlook/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { Progress } from '@onlook/ui/progress';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import CustomDomainSection from './CustomDomainSection';
import { assertNever } from '/common/helpers';

const ShareProject = observer(() => {
    const projectsManager = useProjectsManager();
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const endpoint = projectsManager.hosting?.state.url
        ? `https://${projectsManager.hosting?.state.url}`
        : undefined;
    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [deployProgress, setDeployProgress] = useState(0);
    const [skipBuild, setSkipBuild] = useState(false);
    const [customDomains, setCustomDomains] = useState<CustomDomain[]>([]);
    const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

    useEffect(() => {
        if (projectsManager.hosting?.state.status === HostingStatus.DEPLOYING) {
            setDeployProgress(0);
            const startTime = Date.now();
            const duration = 120000; // 2 minutes

            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / duration) * 100, 95); // Cap at 95%
                setDeployProgress(progress);
            }, 100);

            return () => clearInterval(interval);
        } else {
            setDeployProgress(100);
        }
    }, [projectsManager.hosting?.state.status]);

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
        if (!projectsManager.hosting) {
            console.error('Hosting is not available');
            return;
        }
        if (!userManager.settings) {
            console.error('User is not available');
            return;
        }

        projectsManager.hosting?.createLink();
    };

    const publish = async () => {
        if (!projectsManager.hosting) {
            console.error('Hosting is not available');
            return;
        }

        projectsManager.hosting?.publish(selectedDomains, skipBuild);
    };

    const renderHeader = () => {
        return HostingStateMessages[projectsManager.hosting?.state.status || HostingStatus.NO_ENV];
    };

    useEffect(() => {
        if (isOpen) {
            getCustomDomains();
        }
    }, [isOpen]);

    const getCustomDomains = async () => {
        const domains = await projectsManager.hosting?.getCustomDomains();
        setCustomDomains(domains ?? []);
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
                    Share your app with the world and update it at any time in Onlook. We currently
                    only support Next.js projects.
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
                    className="flex-1 flex items-center bg-background rounded-md border border-background-tertiary h-9 text-sm text-foreground-secondary px-2"
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

    const renderPublishControls = () => {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            projectsManager.hosting?.unpublish(selectedDomains);
                        }}
                        className="flex-1 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive-foreground"
                    >
                        Unpublish
                    </Button>
                    <Button
                        variant="outline"
                        onClick={publish}
                        disabled={projectsManager.hosting?.state.status !== HostingStatus.READY}
                        className={cn(
                            'flex-1',
                            projectsManager.hosting?.state.status === HostingStatus.READY
                                ? 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border-teal-500'
                                : 'cursor-not-allowed',
                        )}
                    >
                        Update
                    </Button>
                </div>
                <div className="flex items-center justify-center space-x-2 hidden">
                    <Checkbox
                        className="text-foreground-tertiary border-foreground-tertiary"
                        id="skip-build"
                        checked={skipBuild}
                        onCheckedChange={(checked) => setSkipBuild(checked ? true : false)}
                    />
                    <label htmlFor="skip-build" className="text-sm text-foreground-tertiary">
                        Skip build (for faster retry)
                    </label>
                </div>
            </div>
        );
    };

    const buttonTextCharacters = useMemo(() => {
        let text = 'Publish';
        if (editorEngine.history.length > 0) {
            text = 'Update';
        } else if (endpoint) {
            text = 'Live';
        }
        return text.split('').map((ch, index) => ({
            id: `sharebutton_${ch}${index}`,
            label: ch,
        }));
    }, [editorEngine.history.length, endpoint]);

    const renderDialogButton = () => {
        const onClick = () => {
            setIsOpen(true);
        };

        const buttonClasses =
            'px-3 flex items-center border-[0.5px] text-xs justify-center shadow-sm h-8 rounded-md transition-all duration-300 ease-in-out';
        let colorClasses = 'border-input bg-background hover:bg-background-onlook text-foreground';

        switch (projectsManager.hosting?.state.status) {
            case HostingStatus.READY:
                colorClasses =
                    'border-teal-300 bg-teal-400/90 hover:bg-teal-500 dark:border-teal-300 dark:bg-teal-700 dark:hover:bg-teal-500/20 dark:text-teal-100';
                return (
                    <motion.div
                        layout
                        transition={{
                            width: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                                delay: 0.2, // Add 200ms delay
                            },
                        }}
                    >
                        <Button
                            variant="default"
                            className={cn(buttonClasses, colorClasses)}
                            onClick={onClick}
                        >
                            <Icons.Globe className="mr-2 h-4 w-4" />
                            <div className="overflow-hidden">
                                <AnimatePresence mode="popLayout">
                                    {buttonTextCharacters.map((character) => (
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
                                                delay: 0.2, // Add 200ms delay
                                            }}
                                        >
                                            {character.label}
                                        </motion.span>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </Button>
                    </motion.div>
                );
            case HostingStatus.ERROR:
                colorClasses = 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500';
                return (
                    <Button
                        variant="default"
                        className={cn(buttonClasses, colorClasses)}
                        onClick={onClick}
                    >
                        <Icons.ExclamationTriangle className="mr-2 h-4 w-4" />
                        Error
                    </Button>
                );
            case HostingStatus.DEPLOYING:
            case HostingStatus.DELETING:
                return (
                    <Button
                        variant="default"
                        className={cn(buttonClasses, colorClasses)}
                        onClick={onClick}
                    >
                        <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                        {projectsManager.hosting?.state.status === HostingStatus.DELETING
                            ? 'Deleting...'
                            : 'Deploying...'}
                    </Button>
                );
            case HostingStatus.NO_ENV:
            default:
                return (
                    <Button
                        variant="default"
                        className={cn(buttonClasses, colorClasses)}
                        onClick={onClick}
                    >
                        <Icons.Globe className="mr-2 h-4 w-4" />
                        Publish
                    </Button>
                );
        }
    };

    const renderReady = () => {
        return (
            <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
            >
                <p className="text-regular text-foreground-secondary">
                    {`Your app is now public – What you see is what your users see. You can unpublish or update it at any time here.`}
                </p>

                <div className="space-y-4">
                    {renderLink()}
                    <CustomDomainSection
                        customDomains={customDomains}
                        selectedDomains={selectedDomains}
                        setSelectedDomains={setSelectedDomains}
                    />
                    {renderPublishControls()}
                </div>
            </motion.div>
        );
    };

    const renderLoading = () => {
        return (
            <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="flex flex-row items-center gap-2 w-full">
                    <Icons.Shadow className="h-4 w-4 animate-spin" />
                    <p className="text-regular text-foreground-secondary">
                        {projectsManager.hosting?.state.message || 'Loading...'}
                    </p>
                </div>
                <Progress value={deployProgress} />
                <p className="text-small text-foreground-secondary">
                    Hint: This may take a while depending on the size of your project. You can close
                    this window and come back later.
                </p>
            </motion.div>
        );
    };

    const renderError = () => {
        return (
            <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <p className="max-w-96 max-h-96 overflow-auto text-regular text-foreground-secondary text-wrap break-words">
                    {projectsManager.hosting?.state.message ||
                        'An error occurred while deploying your app.'}
                </p>
                <Button
                    variant="outline"
                    onClick={() => projectsManager.hosting?.refresh()}
                    className="w-full mt-4"
                >
                    Retry
                </Button>
            </motion.div>
        );
    };

    const renderBody = () => {
        switch (projectsManager.hosting?.state.status) {
            case HostingStatus.READY:
                return renderReady();
            case HostingStatus.DEPLOYING:
            case HostingStatus.DELETING:
                return renderLoading();
            case HostingStatus.ERROR:
                return renderError();
            case HostingStatus.NO_ENV:
                return renderNoEnv();
            default:
                if (projectsManager.hosting?.state.status) {
                    assertNever(projectsManager.hosting?.state.status);
                }
                return renderNoEnv();
        }
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
                    <AnimatePresence mode="wait">{renderBody()}</AnimatePresence>
                </DialogContent>
            </Dialog>
        </>
    );
});

export default ShareProject;
