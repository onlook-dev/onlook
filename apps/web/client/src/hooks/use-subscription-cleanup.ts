import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

type UnsubscribeFunction = () => void;

/**
 * Custom hook to manage subscriptions with automatic cleanup on navigation changes
 * WARNING: This hook only cleans up subscriptions when the pathname changes.
 * @returns Object with addSubscription function and manual cleanup function
 */
export const useSubscriptionCleanup = () => {
    const pathname = usePathname();
    const subscriptionsRef = useRef<Set<UnsubscribeFunction>>(new Set());

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
    const addSubscription = useCallback((unsubscribe: UnsubscribeFunction): UnsubscribeFunction => {
        subscriptionsRef.current.add(unsubscribe);
        
        // Return a function to manually remove this specific subscription
        return () => {
            subscriptionsRef.current.delete(unsubscribe);
            unsubscribe();
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