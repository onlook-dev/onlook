'use client';

import { SettingsModal } from './settings';
import { SubscriptionModal } from './subscription/pricing-page';

export const Modals = () => {
    return (
        <>
            <SettingsModal />
            {/* <QuittingModal /> */}
            <SubscriptionModal />
        </>
    );
};
