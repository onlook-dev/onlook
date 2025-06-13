import type React from 'react';
import { MotionCardContent, MotionCardFooter, MotionCardHeader } from '@onlook/ui/motion-card';
import { MotionConfig } from 'motion/react';
import { AnimatePresence } from 'motion/react';

export const StepHeader = ({ children }: { children: React.ReactNode }) => (
    <MotionCardHeader>{children}</MotionCardHeader>
);

export const StepContent = ({ children }: { children: React.ReactNode }) => (
    <MotionCardContent className="flex items-center w-full min-h-24">
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">
                {children}
            </AnimatePresence>
        </MotionConfig>
    </MotionCardContent>
);

export const StepFooter = ({ children }: { children: React.ReactNode }) => (
    <MotionCardFooter
        initial={{ opacity: 0, y: 200 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 200 }}
        layout="position"
        className="text-sm pb-4 flex flex-row w-full justify-between"
    >   
        {children}
    </MotionCardFooter>
);
