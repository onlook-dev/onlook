export const start = async (sandboxId: string): Promise<{
    previewUrl: string,
    editorUrl: string
}> => {
    return {
        previewUrl: `http://localhost:8084`,
        editorUrl: `http://localhost:8080`,
    };
};

export const stop = async (sandboxId: string) => {
    return {
        previewUrl: `http://localhost:8084`,
        editorUrl: `http://localhost:8080`,
    };
};

export const status = async (sandboxId: string) => {
    return {
        previewUrl: `http://localhost:8084`,
        editorUrl: `http://localhost:8080`,
    };
};