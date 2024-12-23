export type SupportedFramework = 'nextjs' | 'remix' | 'react';

export interface CreateEnvOptions {
    framework: SupportedFramework;
}

export enum DeployState {
    NONE = 'none',
    BUILDING = 'building',
    DEPLOYING = 'deploying',
    DEPLOYED = 'deployed',
    ERROR = 'error',
}

export enum VersionStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
}

export interface DeploymentStatus {
    state: DeployState;
    message?: string;
    endpoint?: string;
}
