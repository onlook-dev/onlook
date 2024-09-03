export enum IdeType {
    VS_CODE = 'VSCode',
    CURSOR = 'Cursor',
}

export class IDE {
    static readonly VS_CODE = new IDE('VSCode', IdeType.VS_CODE, 'vscode');
    static readonly CURSOR = new IDE('Cursor', IdeType.CURSOR, 'cursor');

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
            default:
                throw new Error(`Unknown IDE type: ${type}`);
        }
    }

    static getAll(): IDE[] {
        return [this.VS_CODE, this.CURSOR];
    }
}
