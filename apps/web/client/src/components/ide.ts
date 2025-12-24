import { IdeType } from '@onlook/models/ide';
import type { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';

export class IDE {
    static readonly VS_CODE = new IDE('VSCode', IdeType.VS_CODE, 'vscode', 'VSCodeLogo');
    static readonly CURSOR = new IDE('Cursor', IdeType.CURSOR, 'cursor', 'CursorLogo');
    static readonly ZED = new IDE('Zed', IdeType.ZED, 'zed', 'ZedLogo');
    static readonly WINDSURF = new IDE('Windsurf', IdeType.WINDSURF, 'windsurf', 'WindsurfLogo');
    static readonly ONLOOK = new IDE('Code Panel', IdeType.ONLOOK, 'onlook', 'OnlookLogo');

    private constructor(
        public readonly displayName: string,
        public readonly type: IdeType,
        public readonly command: string,
        public readonly icon: keyof typeof Icons,
    ) { }

    toString() {
        return this.displayName;
    }

    static fromType(type: IdeType): IDE {
        switch (type) {
            case IdeType.VS_CODE:
                return IDE.VS_CODE;
            case IdeType.CURSOR:
                return IDE.CURSOR;
            case IdeType.ZED:
                return IDE.ZED;
            case IdeType.WINDSURF:
                return IDE.WINDSURF;
            case IdeType.ONLOOK:
                return IDE.ONLOOK;
            default:
                assertNever(type);
        }
    }

    static getAll(): IDE[] {
        return [this.VS_CODE, this.CURSOR, this.ZED, this.WINDSURF];
    }

    getCodeFileCommand(filePath: string, line?: number) {
        let command = `${this.command}://file/${filePath}`;
        if (line) {
            command += `:${line}`;
        }
        return command;
    }
}
