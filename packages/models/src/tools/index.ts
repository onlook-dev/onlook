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
