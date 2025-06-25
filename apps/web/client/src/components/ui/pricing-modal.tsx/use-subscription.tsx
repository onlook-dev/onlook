import { api } from "@/trpc/react";
import { ProductType, ScheduledSubscriptionAction } from "@onlook/stripe";
import { toast } from "@onlook/ui/sonner";
import { useEffect, useRef, useState } from "react";

export const useSubscription = () => {
    const { data: subscription, refetch: refetchSubscription } = api.subscription.get.useQuery();
    const isPro = subscription?.product.type === ProductType.PRO;
    const scheduledChange = subscription?.scheduledChange;
    // Polling for subscription to be updated
    const [isPollingForSubscription, setIsPollingForSubscription] = useState(false);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stop polling when subscription becomes pro (payment successful)
    useEffect(() => {
        if (isPollingForSubscription && (isPro || scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION)) {
            stopPollingForSubscription();
            if (isPro) {
                toast.success('Subscription activated successfully!');
            } else {
                toast.success('Subscription cancelled successfully!');
            }
        }
    }, [isPro, isPollingForSubscription, scheduledChange?.scheduledAction]);

    // Cleanup polling on component unmount
    useEffect(() => {
        return () => {
            stopPollingForSubscription();
        };
    }, []);

    const startPollingForSubscription = () => {
        setIsPollingForSubscription(true);

        // Clear any existing intervals
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
        }

        // Start polling every 5 seconds
        pollingIntervalRef.current = setInterval(() => {
            refetchSubscription();
        }, 5000);

        // Stop polling after 5 minutes (300 seconds) as a safety timeout
        pollingTimeoutRef.current = setTimeout(() => {
            stopPollingForSubscription();
            toast.info('Subscription check timed out', {
                description: 'Please refresh the page to see your updated subscription status.',
            });
        }, 300000);
    };

    const stopPollingForSubscription = () => {
        setIsPollingForSubscription(false);

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
    };

    return { subscription, isPro, refetchSubscription, isPollingForSubscription, startPollingForSubscription, stopPollingForSubscription };
};