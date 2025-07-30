import { penpalParent } from '../index';

let lastUrl = window.location.href;

export function listenToNavigationChanges() {    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override pushState
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
            notifyNavigationChange();
        }, 100);
    };

    // Override replaceState
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
            notifyNavigationChange();
        }, 100);
    };

    // Listen for popstate events
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            notifyNavigationChange();
        }, 100);
    });

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
        setTimeout(() => {
            notifyNavigationChange();
        }, 100);
    });
}

function notifyNavigationChange() {
    if (penpalParent) {
        try {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;

                penpalParent.onNavigation({
                    url: currentUrl,
                });
            }


        } catch (error) {
            console.error('Failed to notify navigation change:', error);
        }
    }
} 