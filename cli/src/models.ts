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