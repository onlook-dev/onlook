import { QuittingModal } from './Quitting';
import { SettingsModal } from './Settings';
import { SubscriptionModal } from './Subscription/PricingPage';

export const Modals = () => {
    return (
        <>
            <SettingsModal />
            <QuittingModal />
            <SubscriptionModal />
        </>
    );
};
