export interface EditorServerOptions {
    dev?: boolean;
    port?: number;
    prefix?: string;
}

export const editorServerConfig: EditorServerOptions = {
    dev: true,
    port: 8080,
    prefix: '/trpc',
};
