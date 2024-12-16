declare module '@zonke-cloud/sdk' {
    export enum SupportedFrameworks {
        React = 'react',
        Remix = 'remix',
        NextJs = 'nextjs',
    }

    export interface PreviewEnvironment {
        environmentId: string;
        endpoint: string;
        versions: PreviewEnvironmentVersion[];
    }

    export interface PreviewEnvironmentVersion {
        versionId: string;
        message?: string;
        isLatest: boolean;
        lastUpdated: string;
    }

    export interface CreatePreviewEnvironmentPayload {
        userId?: string;
        framework: SupportedFrameworks;
        awsHostedZone: string;
    }

    export interface DeployToPreviewEnvironmentPayload {
        environmentId: string;
        buildOutputDirectory: string;
        message?: string;
        uploadLinkExpirationOverride?: number;
    }

    export function createPreviewEnvironment(
        payload: CreatePreviewEnvironmentPayload,
    ): Promise<PreviewEnvironment>;
    export function deployToPreviewEnvironment(
        payload: DeployToPreviewEnvironmentPayload,
    ): Promise<PreviewEnvironmentVersion>;
    export function getPreviewEnvironment(environmentId: string): Promise<PreviewEnvironment>;
}
