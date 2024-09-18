import type { ApiResponse } from "../models";

export function isOnlookEnabled(folder: string): Promise<ApiResponse<boolean>> {
    return Promise.resolve({
        status: 'success',
        data: true
    });
}

export function createProject(folder: string, name: string): Promise<ApiResponse> {
    return Promise.resolve({
        status: 'success'
    });
}