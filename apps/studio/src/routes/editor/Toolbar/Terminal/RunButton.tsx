import { useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

const RunButton = observer(() => {
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

    function handleButtonClick() {
        if (!runner) {
            console.error('No runner found.');
            return;
        }

        if (runner.state === RunState.STOPPED) {
            runner.start();
            startLoadingTimer();
        } else if (runner.state === RunState.RUNNING) {
            runner.stop();
        } else if (runner.state === RunState.ERROR) {
            runner.restart();
        } else {
            console.error('Unexpected state:', runner.state);
        }
    }

    function startLoadingTimer() {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 10000);
    }

    function getExtraButtonClasses() {
        if (isLoading) {
            return '';
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
            return 'Running';
        }

        if (runner?.state === RunState.STOPPED) {
            return 'Play';
        }
        if (runner?.state === RunState.ERROR) {
            return 'Restart';
        }
        if (runner?.state === RunState.RUNNING) {
            return 'Stop';
        }
        return 'Unknown';
    }

    const buttonCharacters = useMemo(() => {
        const text = getButtonTitle();
        const characters = text.split('').map((ch, index) => ({
            id: `${ch}${index}`,
            label: index === 0 ? ch.toUpperCase() : ch,
        }));
        return characters;
    }, [runner?.state, isLoading]);

    return (
        <Button
            variant="ghost"
            className={cn(
                'h-11 -my-2 border-transparent rounded-none w-20 px-3 gap-x-1.5 transition-colors duration-300 z-8 relative',
                getExtraButtonClasses(),
            )}
            disabled={
                isLoading ||
                runner?.state === RunState.SETTING_UP ||
                runner?.state === RunState.STOPPING
            }
            onClick={handleButtonClick}
        >
            <div className="z-10">{renderIcon()}</div>
            <span className="text-mini z-10 relative">
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
    );
});

export default RunButton;
