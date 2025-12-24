import { useEffect, useRef, useState } from 'react';

type TabActivityState = 'active' | 'inactive' | 'reactivated';

export function useTabActive() {
    const [tabState, setTabState] = useState<TabActivityState>('active');
    const previousStateRef = useRef<TabActivityState>('active');

    useEffect(() => {
        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            const previousState = previousStateRef.current;
            
            if (isVisible) {
                const newState = previousState === 'inactive' ? 'reactivated' : 'active';
                setTabState(newState);
                previousStateRef.current = newState;
            } else {
                setTabState('inactive');
                previousStateRef.current = 'inactive';
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return { tabState };
}
