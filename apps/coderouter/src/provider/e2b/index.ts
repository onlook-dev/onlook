import { Sandbox as _Sandbox } from '@e2b/code-interpreter';
import { Client, ClientOptions } from '../definition';
import { E2BSandbox } from './sandbox';

export class E2BClient extends Client {
    public readonly sandbox: E2BSandbox;

    // property is initialized by the sandbox class
    // this is the E2B sandbox instance
    _sandbox?: _Sandbox;

    constructor(
        options: ClientOptions,
        public readonly apiKey: string,
    ) {
        super(options);
        this.sandbox = new E2BSandbox(this);
    }
}
