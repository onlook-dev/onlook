import type React from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';

import { MotionCardContent, MotionCardFooter, MotionCardHeader } from '@onlook/ui/motion-card';

export const StepHeader = ({ children }: { children: React.ReactNode }) => (
    <MotionCardHeader>{children}</MotionCardHeader>
);

export const StepContent = ({ children }: { children: React.ReactNode }) => (
    <MotionCardContent className="flex min-h-24 w-full items-center">
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">{children}</AnimatePresence>
        </MotionConfig>
    </MotionCardContent>
);

export const StepFooter = ({ children }: { children: React.ReactNode }) => (
    <MotionCardFooter
        layout="position"
        className="flex w-full flex-row justify-between pb-6 text-sm"
    >
        {children}
    </MotionCardFooter>
);
