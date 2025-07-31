import { penpalParent } from '../index';

export function listenToNavigationChanges() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override pushState
    history.pushState = function (...args) {
        originalPushState.apply(history, args);
        console.log('pushState', args);
        if (args[2]) {
            notifyNavigationChange(args[2]);
        }
    };

    // Override replaceState
    history.replaceState = function (...args) {
        originalReplaceState.apply(history, args);
        console.log('replaceState', args);
        if (args[2]) {
            notifyNavigationChange(args[2]);
        }
    };
}

function notifyNavigationChange(pathname: string) {
    if (penpalParent) {
        try {
            penpalParent.onNavigation({
                pathname,
            });
        } catch (error) {
            console.error('Failed to notify navigation change:', error);
        }
    }
}
