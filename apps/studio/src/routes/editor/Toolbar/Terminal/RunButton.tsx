import { useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { WebviewState } from '@/lib/editor/engine/webview';

declare global {
    interface Window {
        _runButtonCleanup?: () => void;
    }
}

interface RunButtonProps {
    setTerminalHidden: (hidden: boolean) => void;
    webviewState?: WebviewState;
    webviewRef?: React.RefObject<Electron.WebviewTag>;
    isWebviewVisible?: boolean;
}

const RunButton = observer(
    ({ setTerminalHidden, webviewState, webviewRef, isWebviewVisible }: RunButtonProps) => {
        const projectsManager = useProjectsManager();
        const runner = projectsManager.runner;
        const [isLoading, setIsLoading] = useState(false);

        function renderIcon() {
            if (isLoading) {
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
                default:
                    return <Icons.Play />;
            }
        }

        const handleClick = () => {
            if (runner?.state === RunState.RUNNING || runner?.state === RunState.SETTING_UP) {
                runner.stop();
                return;
            }

            startLoadingTimer();
            runner?.start();
        };

        function startLoadingTimer() {
            // Clear any existing timeouts/intervals first
            if (window._runButtonCleanup) {
                window._runButtonCleanup();
            }

            setIsLoading(true);

            const minLoadingDuration = 2000;
            const maxLoadingDuration = 15000;
            const gracePeriod = 3000;

            const startTime = Date.now();
            let consecutiveReadyChecks = 0;
            let graceTimeout: ReturnType<typeof setTimeout>;

            const checkInterval = setInterval(() => {
                const elapsedTime = Date.now() - startTime;

                const isRunnerReady =
                    runner?.state === RunState.RUNNING || runner?.state === RunState.ERROR;
                const isWebviewLoaded = !webviewRef?.current?.isLoading();
                const isComplete = isRunnerReady && isWebviewLoaded;

                if (isComplete) {
                    consecutiveReadyChecks++;
                } else {
                    consecutiveReadyChecks = 0;
                }

                if (consecutiveReadyChecks >= 2 && elapsedTime >= minLoadingDuration) {
                    graceTimeout = setTimeout(() => {
                        setIsLoading(false);
                    }, gracePeriod);
                    clearInterval(checkInterval);
                    return;
                }

                if (elapsedTime >= maxLoadingDuration) {
                    setIsLoading(false);
                    clearInterval(checkInterval);
                }
            }, 100);

            // Store cleanup function globally so we can access it on subsequent starts
            const cleanup = () => {
                clearInterval(checkInterval);
                if (graceTimeout) {
                    clearTimeout(graceTimeout);
                }
            };
            window._runButtonCleanup = cleanup;
            return cleanup;
        }

        function getExtraButtonClasses() {
            if (isLoading) {
                return 'cursor-wait text-gray-700 dark:text-foreground-secondary before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.gray.200/80)_0%,theme(colors.gray.100/20)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.background.onlook/80)_0%,theme(colors.background.onlook/20)_100%)] before:transition-opacity before:duration-300 before:z-0';
            }
            if (runner?.state === RunState.STOPPED) {
                return 'text-teal-700 dark:text-teal-100 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.200/80)_0%,theme(colors.teal.300/80)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.800/80)_0%,theme(colors.teal.500/80)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.300/50)_0%,theme(colors.teal.200/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.500/50)_0%,theme(colors.teal.400/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all before:duration-300 after:duration-300 before:z-0 after:z-0';
            }
            if (runner?.state === RunState.ERROR || runner?.state === RunState.RUNNING) {
                return 'text-gray-700 hover:text-red-700 dark:text-foreground-secondary dark:hover:text-red-200 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.gray.200/80)_0%,theme(colors.gray.100/20)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.background.onlook/80)_0%,theme(colors.background.onlook/20)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.red.200/50)_0%,theme(colors.red.300/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.red.800/50)_0%,theme(colors.red.600/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 before:z-0 after:z-0';
            }
            return '';
        }

        function getButtonTitle() {
            if (isLoading) {
                return 'Starting...';
            }

            if (runner?.state === RunState.STOPPED) {
                return 'Play';
            }
            if (runner?.state === RunState.ERROR) {
                return 'Restart';
            }
            if (runner?.state === RunState.RUNNING || runner?.state === RunState.SETTING_UP) {
                return 'Stop';
            }
            return 'Unknown';
        }

        const buttonCharacters = useMemo(() => {
            const text = getButtonTitle();
            const characters = text.split('').map((ch, index) => ({
                id: `runbutton_${ch}${index}`,
                label: index === 0 ? ch.toUpperCase() : ch,
            }));
            return characters;
        }, [runner?.state, isLoading]);

        const buttonText = getButtonTitle();
        const buttonWidth = useMemo(() => {
            const baseWidth = 50;
            const textWidth = buttonText.length * 8;
            return baseWidth + textWidth;
        }, [buttonText]);

        function getTooltipText() {
            switch (runner?.state) {
                case RunState.STOPPED:
                    return 'Run your app';
                case RunState.RUNNING:
                    return 'Stop Running your App & Clean Code';
                default:
                    return '';
            }
        }

        return (
            <motion.div
                layout="preserve-aspect"
                animate={{ width: buttonWidth }}
                className={cn('overflow-hidden', isLoading ? 'max-w-[100px] cursor-wait' : '')}
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
                                'border-transparent rounded-none px-3 py-6 gap-x-1.5 absolute top-[0.5px] transition-colors duration-300 z-8 relative',
                                getExtraButtonClasses(),
                                isLoading ? 'cursor-wait' : '',
                            )}
                            disabled={
                                isLoading ||
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
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{getTooltipText()}</p>
                    </TooltipContent>
                </Tooltip>
            </motion.div>
        );
    },
);

export default RunButton;
