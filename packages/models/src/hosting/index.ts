export interface CreateEnvOptions {
    framework: 'nextjs' | 'remix' | 'react';
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
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface DeploymentStatus {
    state: DeployState;
    message?: string;
    endpoint?: string;
}
