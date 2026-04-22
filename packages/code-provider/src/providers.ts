export enum CodeProvider {
    CodeSandbox = 'code_sandbox',
    E2B = 'e2b',
    Daytona = 'daytona',
    VercelSandbox = 'vercel_sandbox',
    Modal = 'modal',
    NodeFs = 'node_fs',
    /** 本地 VSCode/Cursor 扩展（通过 WebSocket 桥接） */
    Local = 'local',
}
