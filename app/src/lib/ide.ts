import { IconProps, Icons } from '@/components/icons';
import { FC } from 'react';
import { IdeType } from '/common/ide';
import { TemplateNode } from '/common/models/element/templateNode';

export class IDE {
    static readonly VS_CODE = new IDE('VSCode', IdeType.VS_CODE, 'vscode', Icons.VSCodeLogo);
    static readonly CURSOR = new IDE('Cursor', IdeType.CURSOR, 'cursor', Icons.CursorLogo);
    static readonly ZED = new IDE('Zed', IdeType.ZED, 'zed', Icons.ZedLogo);

    private constructor(
        public readonly displayName: string,
        public readonly type: IdeType,
        public readonly command: string,
        public readonly icon: FC<IconProps>,
    ) {}

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
            default:
                throw new Error(`Unknown IDE type: ${type}`);
        }
    }

    static getAll(): IDE[] {
        return [this.VS_CODE, this.CURSOR, this.ZED];
    }

    getCodeCommand(templateNode: TemplateNode) {
        const filePath = templateNode.path;
        const startTag = templateNode.startTag;
        const endTag = templateNode.endTag || startTag;
        let codeCommand = `${this.command}://file/${filePath}`;

        if (startTag && endTag) {
            const startRow = startTag.start.line;
            const startColumn = startTag.start.column;
            const endRow = endTag.end.line;
            const endColumn = endTag.end.column - 1;
            codeCommand += `:${startRow}:${startColumn}`;
            // Note: Zed API doesn't seem to handle end row/column (ref: https://github.com/zed-industries/zed/issues/18520)
            if (this.type !== IdeType.ZED) {
                codeCommand += `:${endRow}:${endColumn}`;
            }
        }
        return codeCommand;
    }
}