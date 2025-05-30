import { useCreateManager } from '@/components/store/create';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';

export const CreateError = observer(() => {
    const createManager = useCreateManager();
    const error = createManager.error;

    return (
        <motion.p
            className="max-w-xl text-center mt-2 p-2 bg-red-900/80 rounded-xl border border-red-500 text-sm text-red-500 px-4"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={error ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity, filter", transform: "translateZ(0)", display: error ? 'block' : 'none' }}
        >
            {error}
        </motion.p>
    );
});