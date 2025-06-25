import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

type UnsubscribeFunction = () => void;

/**
 * Custom hook to manage subscriptions with automatic cleanup on navigation changes
 * WARNING: This hook only cleans up subscriptions when the pathname changes.
 * @returns Object with addSubscription function and manual cleanup function
 */
export const useCleanupOnPageChange = () => {
    const pathname = usePathname();
    const subscriptionsRef = useRef<Map<string, UnsubscribeFunction>>(new Map());

    // Manual cleanup function
    const clearAllSubscriptions = useCallback(() => {
        subscriptionsRef.current.forEach((unsubscribe) => {
            try {
                unsubscribe();
            } catch (error) {
                console.error('Error during subscription cleanup:', error);
            }
        });
        subscriptionsRef.current.clear();
    }, []);

    // Add a subscription to be tracked
    const addSubscription = useCallback((key: string, unsubscribe: UnsubscribeFunction): UnsubscribeFunction => {
        if (subscriptionsRef.current.has(key)) {
            console.warn(`Subscription with key ${key} already exists. Clearing old subscription.`);
            subscriptionsRef.current.get(key)?.();
        }
        subscriptionsRef.current.set(key, unsubscribe);

        // Return a function to manually remove this specific subscription
        return () => {
            unsubscribe();
            subscriptionsRef.current.delete(key);
        };
    }, []);

    // Cleanup on beforeunload (page refresh/close)
    useEffect(() => {
        const handleBeforeUnload = () => {
            clearAllSubscriptions();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [clearAllSubscriptions]);

    // Cleanup on pathname changes (navigation)
    useEffect(() => {
        return () => {
            clearAllSubscriptions();
        };
    }, [pathname, clearAllSubscriptions]);

    return {
        addSubscription,
        clearAllSubscriptions
    };
}; 