'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Scan } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

export const RecenterCanvasButton = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <AnimatePresence>
            {editorEngine.frameEvent.isCanvasOutOfView && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-center"
                >
                    <p className="text-foreground-secondary mb-2">Your canvas is out of view</p>
                    <Button onClick={editorEngine.frameEvent.recenterCanvas}>
                        <Scan className="size-4" />
                        <span>Re-Center the Canvas</span>
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
