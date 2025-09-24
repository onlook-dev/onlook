import { motion } from 'motion/react';

export function HighDemand() {
    // TODO: Use feature flags
    const isHighDemand = false;

    if (!isHighDemand) {
        return null;
    }

    return (
        <motion.p
            className="mt-2 max-w-xl rounded-xl border border-amber-300 bg-amber-900/80 p-2 px-4 text-center text-sm text-amber-300"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
        >
            {"We're currently experiencing high demand. Project may fail to create."}
        </motion.p>
    );
}
