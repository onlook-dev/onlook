export enum HostingState {
    NO_ENV = 'no-env',
    CREATING_ENV = 'creating-env',
    ENV_FOUND = 'env-found',
    DEPLOYING = 'deploying',
    DELETING_ENV = 'deleting-env',
    ERROR = 'error',
}

export enum VersionStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum DeployState {
    BUILDING = 'building',
    DEPLOYING = 'deploying',
    DEPLOYED = 'deployed',
    ERROR = 'error',
}

export interface CreateEnvOptions {
    framework: 'nextjs' | 'remix' | 'react';
}
