/**
 * Virtual FS

Abstraction over codesandbox or other filesystem containers

Start sequence
Provision project by ID
Start server

API: 
State
    Start(id: string)
    Stop(id: string)
FS
    List(dir: string)
    Read(file: string)
    Write(file: string, content:string)
    Listen(file: string, options: object): callback object
Shell
    Create(shell: string = ‘bash’)
    Run(command: string)
Ports

 */

export class VFS {
    readonly sandbox = {
        start: async (id: string) => {
            return {
                id,
                status: 'started',
            };
        },
    };
    readonly shell = {
        create: async (shell: string = 'bash') => {
            return {
                shell,
            };
        },
    };
    readonly ports = {
        create: async (port: number) => {
            return {
                port,
            };
        },
    };

    constructor() {}
}
