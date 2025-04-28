type HashEntry = {
    hash: string;
    cache_path: string;
};

export type HashesJson = {
    [originalFilePath: string]: HashEntry;
};
