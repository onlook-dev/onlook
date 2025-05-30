import { motion } from 'motion/react';

export function HighDemand({ isMounted }: { isMounted: boolean }) {
    const isHighDemand = false;

    return (
        <motion.p
            className="max-w-xl text-center mt-2 p-2 bg-amber-900/80 rounded-xl border border-amber-300 text-sm text-amber-300 px-4"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={isMounted ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity, filter", transform: "translateZ(0)", display: isHighDemand ? 'block' : 'none' }}
        >
            {"We're currently experiencing high demand. Project may fail to create."}
        </motion.p>
    );
}

