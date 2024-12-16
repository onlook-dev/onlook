export type StreamResponse = {
    content: string;
    status: 'partial' | 'full' | 'error';
};
