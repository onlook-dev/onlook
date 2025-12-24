import { useStateManager } from "@/components/store/state";
import { api } from "@/trpc/react";
import { ProductType, ScheduledSubscriptionAction } from "@onlook/stripe";
import { toast } from "@onlook/ui/sonner";
import { useEffect, useState } from "react";

export const useSubscription = () => {
    const state = useStateManager();
    const { data: subscription, refetch: refetchSubscription } = api.subscription.get.useQuery(undefined, {
        refetchInterval: state.isSubscriptionModalOpen ? 3000 : false,
    });
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
    const isPro = subscription?.product.type === ProductType.PRO;
    const scheduledChange = subscription?.scheduledChange;

    useEffect(() => {
        if (isCheckingSubscription && isPro) {
            if (scheduledChange?.scheduledAction === ScheduledSubscriptionAction.PRICE_CHANGE) {
                toast.success('Subscription updated successfully!');
            } else if (scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION) {
                toast.success('Subscription cancelled successfully!');
            } else {
                toast.success('Subscription activated successfully!');
            }
            setIsCheckingSubscription(false);
        }
    }, [isPro, scheduledChange?.scheduledAction, isCheckingSubscription]);

    return { subscription, isPro, refetchSubscription, isCheckingSubscription, setIsCheckingSubscription };
};