import { useCallback, useEffect, useState } from 'react';

type TabActivityState = 'active' | 'inactive' | 'reactivated';

export function useTabActive() {
    const [tabState, setTabState] = useState<TabActivityState>('active');

    const handleVisibilityChange = useCallback(() => {
        const nowActive = document.visibilityState === 'visible';
        if (!nowActive) {
            setTabState('inactive');
        } else if (tabState === 'inactive') {
            setTabState('reactivated');
        } else {
            setTabState('active');
        }
    }, [tabState]);

    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [handleVisibilityChange]);

    return { tabState };
}
