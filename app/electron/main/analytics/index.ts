import * as Mixpanel from 'mixpanel';

class Analytics {
    mixpanel: ReturnType<typeof Mixpanel.init> | undefined;

    constructor() {
        try {
            this.mixpanel = Mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '');
        } catch (error) {
            console.error('Error initializing Mixpanel:', error);
            console.log('No Mixpanel client, analytics will not be collected');
        }
    }

    track(event: string, data?: Record<string, any>, callback?: () => void) {
        if (this.mixpanel) {
            this.mixpanel.track(event, data || {}, callback);
        }
    }
}

export default Analytics;
