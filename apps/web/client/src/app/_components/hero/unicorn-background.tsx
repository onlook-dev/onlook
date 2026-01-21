'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import UnicornScene from 'unicornstudio-react/next';

export function UnicornBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Handle wheel events to allow scrolling while keeping mouse interactivity
        const handleWheel = (e: WheelEvent) => {
            // Manually trigger scroll on the window
            // This ensures scrolling works even if the canvas captures the wheel event
            window.scrollBy({
                top: e.deltaY,
                left: e.deltaX,
                behavior: 'auto',
            });
        };

        container.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return (
        <motion.div
            ref={containerRef}
            className="absolute inset-0 z-0 h-screen w-screen"
            style={{
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
