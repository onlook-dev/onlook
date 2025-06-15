

export interface ProcessedFile {
    path: string;
    content: string | ArrayBuffer;
    isBinary: boolean;
}

export interface Project {
    name: string;
    folderPath: string;
    files: ProcessedFile[];
}

export interface NextJsProjectValidation {
    isValid: boolean;
    routerType?: 'app' | 'pages';
    error?: string;
}
