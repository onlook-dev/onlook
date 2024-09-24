import CursorIcon from '../src/assets/cursor.svg';
import VsCodeIcon from '../src/assets/vscode.svg';
import ZedIcon from '../src/assets/zed.svg';

export enum IdeType {
    VS_CODE = 'VSCode',
    CURSOR = 'Cursor',
    ZED = 'Zed',
}

export class IDE {
    static readonly VS_CODE = new IDE('VSCode', IdeType.VS_CODE, 'vscode', VsCodeIcon);
    static readonly CURSOR = new IDE('Cursor', IdeType.CURSOR, 'cursor', CursorIcon);
    static readonly ZED = new IDE('Zed', IdeType.ZED, 'zed', ZedIcon);

    private constructor(
        public readonly displayName: string,
        public readonly type: IdeType,
        public readonly command: string,
        public readonly icon: string,
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
}
