import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'motion/react';

interface StepLimitBannerProps {
    show: boolean;
    onContinue: () => void;
    onDismiss: () => void;
}

export const StepLimitBanner = ({ show, onContinue, onDismiss }: StepLimitBannerProps) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="mx-2 mb-2"
                >
                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/50">
                        <div className="flex items-start gap-2">
                            <Icons.InfoCircled className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    Task paused
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
                                    The AI has completed several steps. Would you like to continue?
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDismiss}
                                className="h-7 px-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:text-blue-200 dark:hover:bg-blue-900"
                            >
                                Stop here
                            </Button>
                            <Button
                                size="sm"
                                onClick={onContinue}
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Icons.Play className="h-3 w-3 mr-1" />
                                Continue
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
