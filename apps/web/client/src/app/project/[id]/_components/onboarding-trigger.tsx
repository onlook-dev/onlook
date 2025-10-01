'use client';

import { useOnboarding } from '@/components/onboarding/onboarding-context';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

export const OnboardingTrigger = observer(() => {
    const { startOnboarding, isActive } = useOnboarding();

    return (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[200]">
            <Button
                onClick={startOnboarding}
                variant="outline"
                size="sm"
                className="bg-background/90 backdrop-blur-sm border-primary/30 hover:bg-primary/10 text-foreground-primary shadow-lg"
            >
                {isActive ? 'Restart Tour' : 'Start Tour'}
            </Button>
        </div>
    );
});
