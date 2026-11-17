interface ElectronNoticeContext {
  arch: number;
  appOutDir: string;
  packager: {
    projectDir: string;
    expandMacro(pattern: string, arch: string): string;
    info: { framework: { version: string } };
  };
}
export function electronNoticeDirectory(context: ElectronNoticeContext): string;
export function readElectronNotice(context: ElectronNoticeContext): Buffer;
export default function stageElectronNotice(context: ElectronNoticeContext): void;
