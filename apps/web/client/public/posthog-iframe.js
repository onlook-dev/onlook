(function() {
    function initializePostHog(retryCount = 0) {
        if (typeof posthog === 'undefined') {
            if (retryCount < 10) {
                setTimeout(() => initializePostHog(retryCount + 1), 100);
            }
            return;
        }

        try {
            let parentConfig = {};
            try {
                if (window.parent && window.parent !== window && window.parent.posthog) {
                    parentConfig = window.parent.posthog.config || {};
                }
            } catch (e) {
            }

            const posthogKey = parentConfig.token;
            const posthogHost = parentConfig.api_host;

            if (!posthogKey) {
                console.debug('PostHog key not available for iframe');
                return;
            }

            posthog.init(posthogKey, {
                api_host: posthogHost,
                session_recording: {},
                capture_pageview: false,
                capture_pageleave: false,
                capture_exceptions: false,
                autocapture: false,
                loaded: function(posthog) {
                    console.debug('PostHog iframe recording initialized');
                }
            });
        } catch (error) {
            console.warn('PostHog iframe initialization failed:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePostHog);
    } else {
        initializePostHog();
    }
})();
