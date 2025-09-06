export interface WebSearchResult {
    result: {
        title: string;
        url: string;
        text: string;
        publishedDate: string | null;
        author: string | null;
    }[];
    error: string | null;
}

export interface CheckErrorsResult {
    success: boolean;
    message: string;
    errors: {
        sourceId: string;
        type: string;
        content: string;
        branchId: string;
        branchName: string;
    }[];
    count: number;
}
