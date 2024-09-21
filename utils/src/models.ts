export enum ProjectCreationStage {
    CLONING = 'cloning',
    INSTALLING = 'installing',
    COMPLETE = 'complete',
    ERROR = 'error'
}

export type ProgressCallback = (stage: ProjectCreationStage, message: string) => void;
