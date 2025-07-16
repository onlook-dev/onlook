import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

export const AnnouncementModal = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <AnimatePresence>
            {editorEngine.isAnnouncementOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (editorEngine.isAnnouncementOpen = false)}
                    />
                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed  font-light inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="flex flex-col bg-background border rounded-lg shadow-lg pointer-events-auto w-[580px] p-8 gap-1">
                            <div className="flex flex-row items-center justify-between ">
                                <h2 className="text-2xl font-light">Onlook has moved to the Web</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-background-active text-foreground-secondary"
                                    onClick={() => (editorEngine.isAnnouncementOpen = false)}
                                >
                                    <Icons.CrossL className="h-3 w-3" />
                                </Button>
                            </div>
                            <p className="text-sm text-foreground-secondary">
                                {"It's faster, easier, and has more tools for designing in code."}
                            </p>
                            <div className="flex flex-col dark:bg-blue-800 bg-blue-200 dark:border-blue-300 border rounded-lg p-4 mt-5 gap-3">
                                <h3 className="dark:text-blue-100 text-medium">Get 1 Month Free</h3>
                                <p className="dark:text-blue-200 text-sm">
                                    If you already have Onlook Pro, you get 1 free month on the Tier
                                    1 plan. Just sign up for Onlook Web using the same email.
                                </p>
                                <Button
                                    size="sm"
                                    className="w-fit border-blue-200 border-[0.5px] bg-blue-600 rounded-[4px] hover:bg-blue-700 text-white"
                                    onClick={() => window.open('https://onlook.com', '_blank')}
                                >
                                    Start designing in Onlook Web
                                    <Icons.ExternalLink className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs mt-4 text-foreground-secondary">
                                The desktop app will be sunset after August 31. Thanks for all of
                                your feedback!
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
