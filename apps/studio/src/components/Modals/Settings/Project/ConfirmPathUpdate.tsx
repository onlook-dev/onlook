import { useEditorEngine } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'framer-motion';

const ConfirmPathUpdate = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <AnimatePresence>
            {editorEngine.isConfirmPathUpdateOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (editorEngine.isConfirmPathUpdateOpen = false)}
                    >
                        <div className="bg-green-300 p-4">
                            <h2 className="text-3xl font-bold tracking-widest">Update Path</h2>
                            <p className="font-semibold text-xl tracking-wide">
                                Are you sure that you want to update the location of the
                                application?
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

export default ConfirmPathUpdate;
