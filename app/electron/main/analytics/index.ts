import * as Mixpanel from 'mixpanel';

class Analytics {
    mixpanel: ReturnType<typeof Mixpanel.init> | undefined;

    constructor() {
        return; // Disabled until opt-in flow is created

        try {
            this.mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN || '');
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
