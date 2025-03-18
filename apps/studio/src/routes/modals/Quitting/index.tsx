import { useAppStateManager } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

export const QuittingModal = observer(() => {
    const appStateManager = useAppStateManager();

    return (
        <AnimatePresence>
            {appStateManager.cleaningUp && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (appStateManager.cleaningUp = false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-background border rounded-lg shadow-lg p-0 pointer-events-auto">
                            <div className="p-10 text-xl flex flex-row gap-2 h-full overflow-hidden items-center justify-center">
                                <Icons.Shadow className="w-7 h-7 animate-spin" />
                                <p className="">Closing Onlook...</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
