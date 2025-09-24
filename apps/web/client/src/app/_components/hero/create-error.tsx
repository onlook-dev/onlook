import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';

import { useCreateManager } from '@/components/store/create';

export const CreateError = observer(() => {
    const createManager = useCreateManager();
    const error = createManager.error;

    return (
        <motion.p
            className="mt-2 max-w-xl rounded-xl border border-red-500 bg-red-900/80 p-2 px-4 text-center text-sm text-red-500"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={
                error ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(4px)' }
            }
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            style={{
                willChange: 'opacity, filter',
                transform: 'translateZ(0)',
                display: error ? 'block' : 'none',
            }}
        >
            {error}
        </motion.p>
    );
});
