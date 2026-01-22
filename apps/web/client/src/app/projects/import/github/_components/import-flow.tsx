'use client';

import { MotionCard } from '@onlook/ui/motion-card';

import { SetupGithub } from './setup';

export const ImportFlow = () => {
    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/30 min-h-[12rem] w-[30rem] overflow-hidden p-0 backdrop-blur-md"
        >
            <SetupGithub />
        </MotionCard>
    );
};
