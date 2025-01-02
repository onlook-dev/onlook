export enum HostingState {
    NO_ENV = 'no-env',
    CREATING_ENV = 'creating-env',
    ENV_FOUND = 'env-found',
    DEPLOYING = 'deploying',
    DELETING_ENV = 'deleting-env',
    ERROR = 'error',
}

export const HostingStateMessages = {
    [HostingState.NO_ENV]: 'Share public link',
    [HostingState.CREATING_ENV]: 'Creating environment',
    [HostingState.ENV_FOUND]: 'Public link',
    [HostingState.DEPLOYING]: 'Deploying',
    [HostingState.DELETING_ENV]: 'Deleting environment',
    [HostingState.ERROR]: 'Error',
};

export const LoadingHostingStates = [
    HostingState.CREATING_ENV,
    HostingState.DEPLOYING,
    HostingState.DELETING_ENV,
];

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
