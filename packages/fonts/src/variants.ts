export enum WEIGHT {
    THIN = 'Thin',
    EXTRA_LIGHT = 'Extra Light',
    LIGHT = 'Light',
    REGULAR = 'Regular',
    MEDIUM = 'Medium',
    SEMI_BOLD = 'Semi Bold',
    BOLD = 'Bold',
    EXTRA_BOLD = 'Extra Bold',
    BLACK = 'Black',
}

export const VARIANTS: { name: WEIGHT; value: string }[] = [
    {
        name: WEIGHT.THIN,
        value: '100',
    },
    {
        name: WEIGHT.EXTRA_LIGHT,
        value: '200',
    },
    {
        name: WEIGHT.LIGHT,
        value: '300',
    },
    {
        name: WEIGHT.REGULAR,
        value: '400',
    },
    {
        name: WEIGHT.MEDIUM,
        value: '500',
    },
    {
        name: WEIGHT.SEMI_BOLD,
        value: '600',
    },
    {
        name: WEIGHT.BOLD,
        value: '700',
    },
    {
        name: WEIGHT.EXTRA_BOLD,
        value: '800',
    },
    {
        name: WEIGHT.BLACK,
        value: '900',
    },
];
