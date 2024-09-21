export type ApiResponse<T = void> = SuccessResponse<T> | ErrorResponse;

export type SuccessResponse<T = void> = {
    status: 'success';
    data?: T;
};

export type ErrorResponse = {
    status: 'error';
    error: {
        message: string;
        code: string;
    };
};

export enum ProjectCreationStage {
    CLONING = 'cloning',
    INSTALLING = 'installing',
    COMPLETE = 'complete',
    ERROR = 'error'
}

export type ProgressCallback = (stage: ProjectCreationStage, message: string) => void;
