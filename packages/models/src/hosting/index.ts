export enum HostingStatus {
    NO_ENV = 'no-env',
    READY = 'ready',
    DEPLOYING = 'deploying',
    ERROR = 'error',
    DELETING = 'deleting',
}

export const HostingStateMessages = {
    [HostingStatus.NO_ENV]: 'Share public link (paratushealth.com)',
    [HostingStatus.READY]: 'Public link (paratushealth.com)',
    [HostingStatus.DEPLOYING]: 'Deploying',
    [HostingStatus.ERROR]: 'Error',
    [HostingStatus.DELETING]: 'Deleting',
};
