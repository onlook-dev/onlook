export enum IdeType {
    VS_CODE = 'VSCode',
    CURSOR = 'Cursor',
    ZED = 'Zed',
}

export class IDE {
    static readonly VS_CODE = new IDE('VSCode', IdeType.VS_CODE, 'vscode');
    static readonly CURSOR = new IDE('Cursor', IdeType.CURSOR, 'cursor');
    static readonly ZED = new IDE('Zed', IdeType.ZED, 'zed');

    private constructor(
        public readonly displayName: string,
        public readonly type: IdeType,
        public readonly command: string,
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
