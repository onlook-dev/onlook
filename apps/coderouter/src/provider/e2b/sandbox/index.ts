import { E2BClient } from '../index';
import {
    Sandbox,
    SandboxCreateInput,
    SandboxCreateOutput,
    SandboxGetInput,
    SandboxGetOutput,
    SandboxPauseInput,
    SandboxPauseOutput,
    SandboxResumeInput,
    SandboxResumeOutput,
    SandboxStopInput,
    SandboxStopOutput,
    SandboxUrlInput,
    SandboxUrlOutput,
} from '@/provider/definition/sandbox';
import { Sandbox as _E2BSandbox, SandboxState } from '@e2b/code-interpreter';
import { ClientError, ClientErrorCode } from '@/provider/definition';
import { E2BSandboxFile } from './file';
import { E2BSandboxTerminal } from './terminal';

export class E2BSandbox extends Sandbox<E2BClient> {
    public readonly file: E2BSandboxFile;
    public readonly terminal: E2BSandboxTerminal;

    private _sandboxTimeoutMs: number = 1000 * 60 * 10;

    constructor(protected readonly client: E2BClient) {
        super(client);
        this.file = new E2BSandboxFile(this.client);
        this.terminal = new E2BSandboxTerminal(this.client);
    }

    async beforeSandboxCall(): Promise<void> {
        const e2bSandboxId = (await this.get({})).externalId;
        this.client._sandbox = await _E2BSandbox.connect(e2bSandboxId);
        // bump the timeout to 5 minutes
        this.client._sandbox.setTimeout(this._sandboxTimeoutMs);
    }

    async create(input: SandboxCreateInput): Promise<SandboxCreateOutput> {
        const sandboxId = this.client.options.sandboxId;
        if (!sandboxId) {
            throw new ClientError(
                ClientErrorCode.MissingSandboxId,
                'Sandbox ID is not set. Please provide a sandbox ID in the JWT token.',
                false,
            );
        }
        if (!input.templateId) {
            throw new ClientError(
                ClientErrorCode.MissingTemplateId,
                'Template ID is not set. Please provide a template ID.',
                false,
            );
        }
        const metadata: Record<string, string> = {
            sandboxId,
        };
        if (this.client.options.userId) {
            metadata['userId'] = this.client.options.userId;
        }
        this.client._sandbox = await _E2BSandbox.betaCreate(input.templateId, {
            apiKey: this.client.apiKey,
            timeoutMs: this._sandboxTimeoutMs,
            metadata,
            autoPause: true,
        });
        return {
            externalId: this.client._sandbox.sandboxId,
        };
    }

    async get(input: SandboxGetInput): Promise<SandboxGetOutput> {
        if (!this.client.options.sandboxId) {
            throw new ClientError(
                ClientErrorCode.MissingSandboxId,
                'Sandbox ID is not set. Please provide a sandbox ID in the JWT token.',
                false,
            );
        }
        const query: { state: SandboxState[]; metadata: Record<string, string> } = {
            state: ['running', 'paused'],
            metadata: { sandboxId: this.client.options.sandboxId },
        };
        if (this.client.options.userId) {
            query.metadata['userId'] = this.client.options.userId;
        }
        const res = await _E2BSandbox.list({ query });
        const list = await res.nextItems();
        const e2bSandbox = list?.[0];
        if (!e2bSandbox) {
            throw new ClientError(
                ClientErrorCode.SandboxNotFound,
                'Sandbox not found. Please create a sandbox first.',
                false,
            );
        }
        if (list.length > 1) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Multiple sandboxes found. The system should not create multiple sandboxes with the same sandbox ID.',
                false,
            );
        }
        return {
            id: this.client.options.sandboxId,
            externalId: e2bSandbox.sandboxId,
        };
    }

    async pause(input: SandboxPauseInput): Promise<SandboxPauseOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        await this.client._sandbox.betaPause();
        return {};
    }

    async resume(input: SandboxResumeInput): Promise<SandboxResumeOutput> {
        return {};
    }

    async stop(input: SandboxStopInput): Promise<SandboxStopOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        await this.client._sandbox.kill();
        return {};
    }

    async url(input: SandboxUrlInput): Promise<SandboxUrlOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const url = await this.client._sandbox.getHost(8084);
        return {
            url: url.startsWith('http') ? url : `https://${url}`,
        };
    }
}
