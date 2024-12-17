import { PreviewEnvironmentClient, SupportedFrameworks } from '@zonke-cloud/sdk';
import { PersistentStorage } from '../storage';

export interface CreateEnvOptions {
    framework: 'nextjs' | 'remix' | 'react';
}

const MOCK_ENV = {
    endpoint: 'o95ewhbkzx.preview.zonke.market',
    environmentId: '850540f8-a168-43a6-9772-6a1727d73b93',
    versions: [],
};

class HostingManager {
    private zonke: PreviewEnvironmentClient;
    private static instance: HostingManager;
    private userId: string | null = null;

    private constructor() {
        this.restoreSettings();
        this.zonke = this.initZonkeClient();
    }

    initZonkeClient() {
        if (
            !import.meta.env.VITE_ZONKE_API_KEY ||
            !import.meta.env.VITE_ZONKE_API_TOKEN ||
            !import.meta.env.VITE_ZONKE_API_ENDPOINT
        ) {
            throw new Error('Zonke API key, token, and endpoint must be set');
        }
        return new PreviewEnvironmentClient({
            apiKey: import.meta.env.VITE_ZONKE_API_KEY,
            apiToken: import.meta.env.VITE_ZONKE_API_TOKEN,
            apiEndpoint: import.meta.env.VITE_ZONKE_API_ENDPOINT,
        });
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
        if (this.userId === null) {
            console.error('User ID not found');
            return;
        }

        const framework = options.framework as SupportedFrameworks;
        const awsHostedZone = 'zonke.market';

        return this.zonke.createPreviewEnvironment({
            userId: this.userId,
            framework,
            awsHostedZone,
        });
    }

    getEnv() {
        // TODO: Get project info from project path to determine create params
        return MOCK_ENV;
    }

    publishEnv(envId: string, folderPath: string, buildScript: string) {
        console.log('Publishing environment', {
            envId,
            folderPath,
            buildScript,
        });
        // TODO: Run build script
        // Get S3 link
        // Publish build to S3
        // Return status

        // return this.zonke.publishPreviewEnvironment({
        //     environmentId: envId,
        //     folderPath,
        //     buildScript,
        // });
    }
}

export default HostingManager.getInstance();
