'use client';

import { TooltipProvider } from '@onlook/ui/tooltip';
import { SettingsModal } from './settings';
import { SubscriptionModal } from './subscription/pricing-page';

export const Modals = () => {
    return (
        <TooltipProvider>
            <SettingsModal />
            {/* <QuittingModal /> */}
            <SubscriptionModal />
        </TooltipProvider>
    );
};
