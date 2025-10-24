'use client';

import { MotionCard } from '@onlook/ui/motion-card';
import { SetupGithub } from './setup';

export const ImportFlow = () => {
    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-[30rem] min-h-[12rem] backdrop-blur-md bg-background/30 overflow-hidden p-0"
        >
            <SetupGithub />
        </MotionCard>
    );
};
