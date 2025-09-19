import { CodesandboxClient } from '../index';
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
import { CodeSandbox, Sandbox as _CodesandboxSandbox } from '@codesandbox/sdk';
import { ClientError, ClientErrorCode } from '@/provider/definition';
import { CodesandboxSandboxFile } from './file';
import { CodesandboxSandboxTerminal } from './terminal';

export class CodesandboxSandbox extends Sandbox<CodesandboxClient> {
    public readonly file: CodesandboxSandboxFile;
    public readonly terminal: CodesandboxSandboxTerminal;

    constructor(protected readonly client: CodesandboxClient) {
        super(client);
        this.file = new CodesandboxSandboxFile(this.client);
        this.terminal = new CodesandboxSandboxTerminal(this.client);
    }

    async beforeSandboxCall(): Promise<void> {
        this.client._sdk = new CodeSandbox();
        if (this.client.options.sandboxId) {
            this.client._sandbox = await this.client._sdk.sandboxes.resume(
                this.client.options.sandboxId,
            );
            this.client._client = await this.client._sandbox.createRestSession();
        }
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
        const sdk = new CodeSandbox();

        const newSandbox = await sdk.sandboxes.create({
            id: sandboxId,
            source: 'template',
            title: input.metadata['title'],
            description: input.metadata['description'],
            tags: input.metadata['tags']?.split(','),
        });

        return {
            externalId: newSandbox.id,
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
        // not a big fan of this, however, the other way is to filter a list of sandboxes and the API
        // is not great for that
        const sdk = new CodeSandbox();
        const sandbox = await sdk.sandboxes.resume(this.client.options.sandboxId);
        return {
            id: this.client.options.sandboxId,
            externalId: sandbox.id,
        };
    }

    async pause(input: SandboxPauseInput): Promise<SandboxPauseOutput> {
        if (!this.client.options.sandboxId) {
            throw new ClientError(
                ClientErrorCode.MissingSandboxId,
                'Sandbox ID is not set. Please provide a sandbox ID in the JWT token.',
                false,
            );
        }
        const sdk = new CodeSandbox();
        await sdk.sandboxes.hibernate(this.client.options.sandboxId);
        return {};
    }

    async resume(input: SandboxResumeInput): Promise<SandboxResumeOutput> {
        return {};
    }

    async stop(input: SandboxStopInput): Promise<SandboxStopOutput> {
        if (!this.client.options.sandboxId) {
            throw new ClientError(
                ClientErrorCode.MissingSandboxId,
                'Sandbox ID is not set. Please provide a sandbox ID in the JWT token.',
                false,
            );
        }
        const sdk = new CodeSandbox();
        await sdk.sandboxes.shutdown(this.client.options.sandboxId);
        return {};
    }

    async url(input: SandboxUrlInput): Promise<SandboxUrlOutput> {
        return {
            url: `https://${this.client.options.sandboxId}-3000.csb.app`,
        };
    }
}
