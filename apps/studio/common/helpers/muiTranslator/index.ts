export interface ResultCode {
    selectorName: string;
    resultVal: string;
}

export const CssToMaterialUITranslator = (css: string) => {
    return {
        code: 'OK',
        data: [
            {
                selectorName: css,
                resultVal: css,
            },
        ] as ResultCode[],
    };
};
