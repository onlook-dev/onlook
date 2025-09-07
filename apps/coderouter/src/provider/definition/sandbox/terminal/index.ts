import { Client } from '../../index';

export interface SandboxTerminalCommandInput {
    command: string;
}
export interface SandboxTerminalCommandOutput {
    is_error: boolean;
    output: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
}

export interface SandboxTerminalCreateInput {
    terminalId: string;
    name?: string;
}
export interface SandboxTerminalCreateOutput {
    terminalId: string;
    name?: string;
}

export interface SandboxTerminalOpenInput {
    terminalId: string;
}
export interface SandboxTerminalOpenOutput {
    id: string;
    output: string;
}

export interface SandboxTerminalWriteInput {
    terminalId: string;
    input: string;
}
export interface SandboxTerminalWriteOutput {
    output: string;
}

export interface SandboxTerminalKillInput {
    terminalId: string;
}
export interface SandboxTerminalKillOutput {
    output: string;
}

export interface SandboxTerminalRunInput {
    terminalId: string;
    input: string;
}
export interface SandboxTerminalRunOutput {
    output: string;
}

export abstract class SandboxTerminal<T extends Client> {
    constructor(protected readonly client: T) {}

    // act like a static function, does not open a new terminal
    abstract command(input: SandboxTerminalCommandInput): Promise<SandboxTerminalCommandOutput>;

    abstract create(input: SandboxTerminalCreateInput): Promise<SandboxTerminalCreateOutput>;
    abstract open(
        input: SandboxTerminalOpenInput,
        onOutput: (output: SandboxTerminalOpenOutput) => void,
    ): Promise<{ close: () => void }>;
    abstract write(input: SandboxTerminalWriteInput): Promise<SandboxTerminalWriteOutput>;
    abstract run(input: SandboxTerminalRunInput): Promise<SandboxTerminalRunOutput>;
    abstract kill(input: SandboxTerminalKillInput): Promise<SandboxTerminalKillOutput>;
}
