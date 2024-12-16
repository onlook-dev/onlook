import {
    SupportedFrameworks,
    createPreviewEnvironment,
    deployToPreviewEnvironment,
    getPreviewEnvironment,
} from '@zonke-cloud/sdk';

export interface CreateEnvOptions {
    userId?: string;
    hostedZone: string;
}

export async function createEnv(options: CreateEnvOptions) {
    return createPreviewEnvironment({
        userId: options.userId,
        framework: SupportedFrameworks.React,
        awsHostedZone: options.hostedZone,
    });
}

export interface DeployOptions {
    environmentId: string;
    buildOutputDirectory: string;
    message?: string;
}

export async function deploy(options: DeployOptions) {
    const { environmentId, buildOutputDirectory, message } = options;

    return deployToPreviewEnvironment({
        environmentId,
        buildOutputDirectory,
        message,
        // Default to 60 seconds for upload link expiration
        uploadLinkExpirationOverride: 60,
    });
}

export async function getEnv(envId: string) {
    return getPreviewEnvironment(envId);
}
