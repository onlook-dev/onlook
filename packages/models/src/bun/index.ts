export interface RunBunCommandOptions {
    cwd: string;
    env?: NodeJS.ProcessEnv;
}

export interface RunBunCommandResult {
    success: boolean;
    error?: string;
    output?: string;
}

export interface DetectedPortResults {
    isPortTaken: boolean;
    availablePort: number;
}
