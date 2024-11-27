import { useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();
    const runner = projectsManager.runner;

    function renderIcon() {
        switch (runner?.state) {
            case RunState.SETTING_UP:
            case RunState.STOPPING:
                return <Icons.Shadow className="animate-spin z-10" />;
            case RunState.ERROR:
                return <Icons.ExclamationTriangle className="z-10" />;
            case RunState.RUNNING:
                return <Icons.Stop className="z-10" />;
            default:
                return <Icons.Play className="z-10" />;
        }
    }

    function handleButtonClick() {
        if (!runner) {
            console.error('No runner found.');
            return;
        }

        if (runner.state === RunState.STOPPED) {
            runner.start();
        } else if (runner.state === RunState.RUNNING) {
            runner.stop();
        } else if (runner.state === RunState.ERROR) {
            runner.restart();
        } else {
            console.error('Unexpected state:', runner.state);
        }
    }

    const buttonCharacters = useMemo(() => {
        const text = runner?.state === RunState.STOPPED ? 'Play' : 'Stop';
        const characters = text.split('').map((ch, index) => ({
            id: `${ch}${index}`,
            label: index === 0 ? ch.toUpperCase() : ch,
        }));
        return characters;
    }, [runner?.state]);

    return (
        <Button
            variant="ghost"
            className={cn(
                'h-11 -my-2 border-transparent rounded-none w-20 px-3 gap-x-1.5 relative transition-colors duration-300',
                runner?.state === RunState.STOPPED &&
                    'text-teal-700 dark:text-teal-100 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.200/80)_0%,theme(colors.teal.300/80)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.800/80)_0%,theme(colors.teal.500/80)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.300/50)_0%,theme(colors.teal.200/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.500/50)_0%,theme(colors.teal.400/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-all after:transition-all before:duration-300 after:duration-300 before:z-0 after:z-0',
                (runner?.state === RunState.ERROR || runner?.state === RunState.RUNNING) &&
                    'text-gray-700 hover:text-red-700 dark:text-foreground-secondary dark:hover:text-red-200 before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.gray.200/80)_0%,theme(colors.gray.100/20)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.background.onlook/80)_0%,theme(colors.background.onlook/20)_100%)] after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.red.200/50)_0%,theme(colors.red.300/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.red.800/50)_0%,theme(colors.red.600/50)_100%)] after:opacity-0 hover:after:opacity-100 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 before:z-0 after:z-0',
                'z-8 relative',
            )}
            disabled={runner?.state === RunState.SETTING_UP || runner?.state === RunState.STOPPING}
            onClick={handleButtonClick}
        >
            {renderIcon()}
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
