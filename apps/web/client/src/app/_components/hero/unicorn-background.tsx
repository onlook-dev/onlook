'use client';

import { motion } from 'motion/react';
import UnicornScene from 'unicornstudio-react/next';

export function UnicornBackground() {
    return (
        <motion.div
            className="absolute inset-0 z-0 h-screen w-screen"
            style={{
                pointerEvents: 'none',
                willChange: 'opacity',
                transform: 'translateZ(0)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 1 }}
        >
            <UnicornScene
                jsonFilePath="/scenes/flow-background.json"
                width="100%"
                height="100%"
                scale={1}
                dpi={1}
                fps={60}
                onError={(error) => console.error('UnicornScene error:', error)}
                onLoad={() => console.log('UnicornScene loaded successfully')}
            />
        </motion.div>
    );
}
