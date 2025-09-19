import { CodeSandbox, RestSession, Sandbox } from '@codesandbox/sdk';
import { Client, ClientOptions } from '../definition';
import { CodesandboxSandbox } from './sandbox';

export class CodesandboxClient extends Client {
    public readonly sandbox: CodesandboxSandbox;

    // property is initialized by the sandbox class
    // this is the Codesandbox sandbox instance
    _sdk?: CodeSandbox;
    _sandbox?: Sandbox;
    _client?: RestSession;

    constructor(
        options: ClientOptions,
        public readonly apiKey: string,
    ) {
        super(options);
        this.sandbox = new CodesandboxSandbox(this);
    }
}
