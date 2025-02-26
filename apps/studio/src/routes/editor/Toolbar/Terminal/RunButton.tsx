import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import PortWarningModal from './PortWarningModal';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();
    const editorEngine = useEditorEngine();
    const runner = projectsManager.runner;
    const isPortAvailable = runner?.port?.isPortAvailable;
    const [isPortModalOpen, setIsPortModalOpen] = useState(false);

    const handleClick = () => {
        if (!isPortAvailable) {
            setIsPortModalOpen(true);
            return;
        }

        if (runner?.state === RunState.RUNNING || runner?.state === RunState.SETTING_UP) {
            runner?.stop();
            return;
        }

        if (runner?.state === RunState.ERROR) {
            runner.restart();
            editorEngine.errors.clear();
            return;
        }
        runner?.start();
    };

    function renderIcon() {
        if (!isPortAvailable) {
            return <Icons.ExclamationTriangle className="text-amber-100" />;
        }

        if (runner?.isLoading) {
            return <Icons.Shadow className="animate-spin" />;
        }

        switch (runner?.state) {
            case RunState.SETTING_UP:
            case RunState.STOPPING:
                return <Icons.Shadow className="animate-spin" />;
            case RunState.ERROR:
                return <Icons.ExclamationTriangle />;
            case RunState.RUNNING:
                return <Icons.Stop />;
            case RunState.STOPPED:
                return <Icons.Play />;
            default:
                return <Icons.Play />;
        }
    }

    function getExtraButtonClasses() {
        if (!isPortAvailable) {
            return 'text-amber-700 dark:text-amber-100 border-amber-500 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.amber.200/80)_0%,theme(colors.amber.300/80)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.amber.800/80)_0%,theme(colors.amber.500/80)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.amber.300/50)_0%,theme(colors.amber.200/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.amber.500/50)_0%,theme(colors.amber.400/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all before:duration-300 after:duration-300 before:z-0 after:z-0';
        }

        if (runner?.isLoading) {
            return 'cursor-wait text-gray-700 dark:text-foreground-secondary before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.gray.200/80)_0%,theme(colors.gray.100/20)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.background.onlook/80)_0%,theme(colors.background.onlook/20)_100%)] before:transition-opacity before:duration-300 before:z-0';
        }

        switch (runner?.state) {
            case RunState.STOPPED:
                return 'text-teal-700 dark:text-teal-100 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.200/80)_0%,theme(colors.teal.300/80)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.800/80)_0%,theme(colors.teal.500/80)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.300/50)_0%,theme(colors.teal.200/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.500/50)_0%,theme(colors.teal.400/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all before:duration-300 after:duration-300 before:z-0 after:z-0';
            case RunState.ERROR:
            case RunState.RUNNING:
                return 'text-gray-700 hover:text-red-700 dark:text-foreground-secondary dark:hover:text-red-200 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.gray.200/80)_0%,theme(colors.gray.100/20)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.background.onlook/80)_0%,theme(colors.background.onlook/20)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.red.200/50)_0%,theme(colors.red.300/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.red.800/50)_0%,theme(colors.red.600/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 before:z-0 after:z-0';
            default:
                return '';
        }
    }

    function getButtonTitle() {
        // Prioritize port conflict message
        if (!isPortAvailable) {
            return 'Port in Use';
        }

        if (runner?.isLoading) {
            return 'Loading';
        }

        switch (runner?.state) {
            case RunState.STOPPED:
                return 'Play';
            case RunState.ERROR:
                return 'Retry';
            case RunState.RUNNING:
            case RunState.SETTING_UP:
                return 'Stop';
            default:
                return 'Play';
        }
    }

    const buttonText = getButtonTitle();
    const buttonCharacters = useMemo(() => {
        const text = getButtonTitle();
        const characters = text.split('').map((ch, index) => ({
            id: `runbutton_${ch === ' ' ? 'space' : ch}${index}`,
            label: index === 0 ? ch.toUpperCase() : ch,
        }));
        return characters;
    }, [runner?.state, runner?.isLoading, isPortAvailable]);

    const buttonWidth = useMemo(() => {
        const baseWidth = 50;
        const textWidth = buttonText.length * 8;
        return Math.min(baseWidth + textWidth, 112);
    }, [buttonText]);

    function getTooltipText() {
        switch (runner?.state) {
            case RunState.STOPPED:
                return 'Run your App';
            case RunState.RUNNING:
                return 'Stop Running your App & Clean Code';
            case RunState.ERROR:
                return 'Restart your App';
            default:
                if (!isPortAvailable) {
                    return 'Click to resolve port conflict';
                }
                return 'Unknown app state';
        }
    }

    return (
        <>
            <motion.div
                layout="preserve-aspect"
                animate={{ width: buttonWidth }}
                className={cn(
                    'overflow-hidden',
                    runner?.isLoading ? 'max-w-[100px] cursor-wait' : '',
                )}
                transition={{
                    type: 'spring',
                    bounce: 0.2,
                    duration: 0.6,
                    stiffness: 150,
                    damping: 20,
                }}
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                'border-transparent rounded-none px-3 py-6 gap-x-1.5 top-[0.5px] transition-colors duration-300 z-8 relative',
                                getExtraButtonClasses(),
                                runner?.isLoading ? 'cursor-wait' : '',
                            )}
                            disabled={
                                runner?.isLoading ||
                                runner?.state === RunState.SETTING_UP ||
                                runner?.state === RunState.STOPPING
                            }
                            onClick={handleClick}
                        >
                            <div className="z-10">{renderIcon()}</div>
                            <span className="text-mini z-10 relative overflow-hidden">
                                <AnimatePresence mode="popLayout">
                                    {buttonCharacters.map((character) => (
                                        <motion.span
                                            key={character.id}
                                            layoutId={character.id}
                                            layout="position"
                                            className={cn(
                                                'inline-block',
                                                character.label === ' ' && 'w-[0.4em]',
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
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{getTooltipText()}</p>
                    </TooltipContent>
                </Tooltip>
            </motion.div>

            <PortWarningModal open={isPortModalOpen} onOpenChange={setIsPortModalOpen} />
        </>
    );
});

export default RunButton;
