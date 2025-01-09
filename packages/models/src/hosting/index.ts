export enum HostingStatus {
    NO_ENV = 'no-env',
    READY = 'ready',
    DEPLOYING = 'deploying',
    ERROR = 'error',
    DELETING = 'deleting',
}

export const HostingStateMessages = {
    [HostingStatus.NO_ENV]: 'Share public link',
    [HostingStatus.READY]: 'Public link',
    [HostingStatus.DEPLOYING]: 'Deploying',
    [HostingStatus.ERROR]: 'Error',
    [HostingStatus.DELETING]: 'Deleting',
};
