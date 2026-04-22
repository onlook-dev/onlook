/**
 * 项目运行环境类型
 * 用于区分项目是在远程沙箱中运行还是在本地 VSCode/Cursor 中运行
 */
export enum ProjectEnvironment {
    /** 远程沙箱环境（CodeSandbox） */
    SANDBOX = 'sandbox',
    /** 本地 VSCode/Cursor 环境 */
    LOCAL_VSCODE = 'local_vscode',
}
