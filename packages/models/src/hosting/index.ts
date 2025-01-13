import { HOSTING_DOMAIN } from '../constants';

export enum HostingStatus {
    NO_ENV = 'no-env',
    READY = 'ready',
    DEPLOYING = 'deploying',
    ERROR = 'error',
    DELETING = 'deleting',
}

export const HostingStateMessages = {
    [HostingStatus.NO_ENV]: `Share public link (${HOSTING_DOMAIN})`,
    [HostingStatus.READY]: `Public link (${HOSTING_DOMAIN})`,
    [HostingStatus.DEPLOYING]: 'Deploying',
    [HostingStatus.ERROR]: 'Error',
    [HostingStatus.DELETING]: 'Deleting',
};
