'use client';

import { motion } from 'framer-motion';
import UnicornScene from 'unicornstudio-react/next';

export function UnicornBackground() {
    return (
        <div className="absolute inset-0 w-full h-screen overflow-hidden">
            <motion.div
                className="absolute inset-0 w-full h-[calc(100vh+80px)] z-0"
                style={{
                    pointerEvents: 'none',
                    willChange: "opacity",
                    transform: "translateZ(0)"
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 1 }}
            >
                <UnicornScene
                    projectId="Gr1LmwbKSeJOXhpYEdit"
                    width="100%"
                    height="100%"
                    scale={1}
                    dpi={1}
                    fps={60}
                    onError={(error) => console.error('UnicornScene error:', error)}
                    onLoad={() => console.log('UnicornScene loaded successfully')}
                />
            </motion.div>
        </div>
    );
}