import { SupportedFrameworks, createPreviewEnvironment } from '@zonke-cloud/sdk';
import { PersistentStorage } from '../storage';

export interface CreateEnvOptions {
    framework: 'nextjs' | 'remix' | 'react';
}

const MOCK_ENV = {
    versions: [
        {
            isLatest: true,
            lastUpdated: '2021-11-12T00:00:00Z',
            versionId: 'GXtMmG9qhkD8_QOiIP591JQSQxwMqHRv',
        },
    ],
    environmentId: '7366e360-a5f4-437a-9678-8bb0397067c2',
    endpoint: 'y9mashx88v.preview.zonke.market',
};

class HostingManager {
    private static instance: HostingManager;
    private userId: string | null = null;

    private constructor() {
        this.restoreSettings();
    }

    public static getInstance(): HostingManager {
        if (!HostingManager.instance) {
            HostingManager.instance = new HostingManager();
        }
        return HostingManager.instance;
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        this.userId = settings.id || null;
    }

    createEnv(options: CreateEnvOptions) {
        // TODO: Get project info from project path to determine create params
        console.log('createEnv', {
            ZONKE_API_KEY: process.env.ZONKE_API_KEY,
            ZONKE_API_TOKEN: process.env.ZONKE_API_TOKEN,
            ZONKE_API_ENDPOINT: process.env.ZONKE_API_ENDPOINT,
        });
        return MOCK_ENV;
        if (this.userId === null) {
            console.error('User ID not found');
            return;
        }

        const framework = options.framework as SupportedFrameworks;
        const awsHostedZone = 'zonke.market';

        return createPreviewEnvironment({
            userId: this.userId,
            framework,
            awsHostedZone,
        });
    }

    getEnv() {
        // TODO: Get project info from project path to determine create params
        return MOCK_ENV;
    }
}

export default HostingManager.getInstance();
