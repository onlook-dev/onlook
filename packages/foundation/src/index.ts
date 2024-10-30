export { createProject } from './create';
export { setupProject } from './setup';
export { verifyProject } from './verify';

export enum CreateStage {
    CLONING = 'cloning',
    GIT_INIT = 'git_init',
    INSTALLING = 'installing',
    COMPLETE = 'complete',
    ERROR = 'error'
}

export enum VerifyStage {
    CHECKING = 'checking',
    NOT_INSTALLED = 'not_installed',
    INSTALLED = 'installed',
    ERROR = 'error'
}

export enum SetupStage {
    INSTALLING = 'installing',
    CONFIGURING = 'configuring',
    COMPLETE = 'complete',
    ERROR = 'error'
}

export type CreateCallback = (stage: CreateStage, message: string) => void;
export type VerifyCallback = (stage: VerifyStage, message: string) => void;
export type SetupCallback = (stage: SetupStage, message: string) => void;
