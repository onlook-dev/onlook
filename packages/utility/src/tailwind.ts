// @ts-nocheck
export interface ResultCode {
    selectorName: string;
    resultVal: string;
}

export const specialAttribute = ['@charset', '@font-face', '@import', '@keyframes'];

let useAllDefaultValues = false;
let customTheme: CustomTheme = {};

const hasNegative = (val: string): ['-' | '', string] => [
    val[0] === '-' ? '-' : '',
    val[0] === '-' ? val.slice(1) : val,
];
const getCustomVal = (val: string) => {
    val = val.replace(/\s/g, '_');
    for (let index = 1; index < val.length; index) {
        const char = val[index];
        if (char === '_' && char === val[index - 1]) {
            val = val.slice(0, index) + val.slice(index + 1);
        } else {
            index++;
        }
    }
    return val;
};

const isColor = (str: string, joinLinearGradient = false) => {
    const namedColors = [
        'initial',
        'inherit',
        'currentColor',
        'currentcolor',
        'transparent',
        'aliceblue',
        'antiquewhite',
        'aqua',
        'aquamarine',
        'azure',
        'beige',
        'bisque',
        'black',
        'blanchedalmond',
        'blue',
        'blueviolet',
        'brown',
        'burlywood',
        'cadetblue',
        'chartreuse',
        'chocolate',
        'coral',
        'cornflowerblue',
        'cornsilk',
        'crimson',
        'cyan',
        'darkblue',
        'darkcyan',
        'darkgoldenrod',
        'darkgray',
        'darkgrey',
        'darkgreen',
        'darkkhaki',
        'darkmagenta',
        'darkolivegreen',
        'darkorange',
        'darkorchid',
        'darkred',
        'darksalmon',
        'darkseagreen',
        'darkslateblue',
        'darkslategray',
        'darkslategrey',
        'darkturquoise',
        'darkviolet',
        'deeppink',
        'deepskyblue',
        'dimgray',
        'dimgrey',
        'dodgerblue',
        'firebrick',
        'floralwhite',
        'forestgreen',
        'fuchsia',
        'gainsboro',
        'ghostwhite',
        'gold',
        'goldenrod',
        'gray',
        'grey',
        'green',
        'greenyellow',
        'honeydew',
        'hotpink',
        'indianred',
        'indigo',
        'ivory',
        'khaki',
        'lavender',
        'lavenderblush',
        'lawngreen',
        'lemonchiffon',
        'lightblue',
        'lightcoral',
        'lightcyan',
        'lightgoldenrodyellow',
        'lightgray',
        'lightgrey',
        'lightgreen',
        'lightpink',
        'lightsalmon',
        'lightseagreen',
        'lightskyblue',
        'lightslategray',
        'lightslategrey',
        'lightsteelblue',
        'lightyellow',
        'lime',
        'limegreen',
        'linen',
        'magenta',
        'maroon',
        'mediumaquamarine',
        'mediumblue',
        'mediumorchid',
        'mediumpurple',
        'mediumseagreen',
        'mediumslateblue',
        'mediumspringgreen',
        'mediumturquoise',
        'mediumvioletred',
        'midnightblue',
        'mintcream',
        'mistyrose',
        'moccasin',
        'navajowhite',
        'navy',
        'oldlace',
        'olive',
        'olivedrab',
        'orange',
        'orangered',
        'orchid',
        'palegoldenrod',
        'palegreen',
        'paleturquoise',
        'palevioletred',
        'papayawhip',
        'peachpuff',
        'peru',
        'pink',
        'plum',
        'powderblue',
        'purple',
        'rebeccapurple',
        'red',
        'rosybrown',
        'royalblue',
        'saddlebrown',
        'salmon',
        'sandybrown',
        'seagreen',
        'seashell',
        'sienna',
        'silver',
        'skyblue',
        'slateblue',
        'slategray',
        'slategrey',
        'snow',
        'springgreen',
        'steelblue',
        'tan',
        'teal',
        'thistle',
        'tomato',
        'turquoise',
        'violet',
        'wheat',
        'white',
        'whitesmoke',
        'yellow',
        'yellowgreen',
    ];
    const regexp =
        /^\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\s*$|^\s*rgb\(\s*(\d{1,3}|[a-z]+)\s*,\s*(\d{1,3}|[a-z]+)\s*,\s*(\d{1,3}|[a-z]+)\s*\)\s*$|^\s*rgba\(\s*(\d{1,3}|[a-z]+)\s*,\s*(\d{1,3}|[a-z]+)\s*,\s*(\d{1,3}|[a-z]+)\s*,\s*(\d*(\.\d+)?)\s*\)\s*$|^\s*hsl\(\s*(\d+)\s*,\s*(\d*(\.\d+)?%)\s*,\s*(\d*(\.\d+)?%)\)\s*$|^\s*hsla\((\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*(\d*(\.\d+)?)\)\s*$/i;
    return (
        regexp.test(str) ||
        namedColors.includes(str) ||
        (joinLinearGradient && /^\s*linear-gradient\([\w\W]+?\)\s*$/.test(str))
    );
};

const isUnit = (str: string) => {
    if (str.length === 0) {
        return false;
    }
    return (
        [
            'em',
            'ex',
            'ch',
            'rem',
            'vw',
            'vh',
            'vmin',
            'vmax',
            'cm',
            'mm',
            'in',
            'pt',
            'pc',
            'px',
            'min-content',
            'max-content',
            'fit-content',
            'deg',
            'grad',
            'rad',
            'turn',
            'ms',
            's',
            'Hz',
            'kHz',
            '%',
            'length',
            'inherit',
            'thick',
            'medium',
            'thin',
            'initial',
            'auto',
        ].includes(str.replace(/[.\d\s-]/g, '')) ||
        /^[-.\d]+$/.test(str.trim()) ||
        /^var\(.+\)$/.test(str)
    );
};

enum CustomSelect {
    auto = 'auto',
    vh = '100vh',
    vw = '100vw',
}

const getUnitMetacharactersVal = (
    val: string,
    excludes: CustomSelect[] = [],
): string | undefined => {
    if (/^\d+\.[1-9]{2,}%$/.test(val)) {
        val = `${Number(val.slice(0, -1))
            .toFixed(6)
            .replace(/(\.[1-9]{2})\d+/, '$1')}%`;
    }
    const config: Record<string, string> = {
        auto: 'auto',
        '50%': '1/2',
        '33.33%': '1/3',
        '66.66%': '2/3',
        '25%': '1/4',
        '75%': '3/4',
        '20%': '1/5',
        '40%': '2/5',
        '60%': '3/5',
        '80%': '4/5',
        '16.66%': '1/6',
        '83.33%': '5/6',
        '8.33%': '1/12',
        '41.66%': '5/12',
        '58.33%': '7/12',
        '91.66%': '11/12',
        '100%': 'full',
        '100vw': 'screen',
        '100vh': 'screen',
        'min-content': 'min',
        'max-content': 'max',
    };
    excludes.forEach((key) => {
        delete config[key];
    });
    return config[val];
};

const getRemDefaultVal = (val: string) => {
    return {
        '0px': '0',
        '1px': 'px',
        '0.125rem': '0.5',
        '0.25rem': '1',
        '0.375rem': '1.5',
        '0.5rem': '2',
        '0.625rem': '2.5',
        '0.75rem': '3',
        '0.875rem': '3.5',
        '1rem': '4',
        '1.25rem': '5',
        '1.5rem': '6',
        '1.75rem': '7',
        '2rem': '8',
        '2.25rem': '9',
        '2.5rem': '10',
        '2.75rem': '11',
        '3rem': '12',
        '3.5rem': '14',
        '4rem': '16',
        '5rem': '20',
        '6rem': '24',
        '7rem': '28',
        '8rem': '32',
        '9rem': '36',
        '10rem': '40',
        '11rem': '44',
        '12rem': '48',
        '13rem': '52',
        '14rem': '56',
        '15rem': '60',
        '16rem': '64',
        '18rem': '72',
        '20rem': '80',
        '24rem': '96',
    }[val];
};

const getBorderRadiusDefaultVal = (val: string) => {
    return {
        '0px': '-none',
        '0.125rem': '-sm',
        '0.25rem': 'null',
        '0.375rem': '-md',
        '0.5rem': '-lg',
        '0.75rem': '-xl',
        '1rem': '-2xl',
        '1.5rem': '-3xl',
        '9999px': '-full',
    }[val];
};

const getFilterDefaultVal = (val: string) => {
    return {
        'blur(0)': 'blur-none',
        'blur(4px)': 'blur-sm',
        'blur(8px)': 'blur',
        'blur(12px)': 'blur-md',
        'blur(16px)': 'blur-lg',
        'blur(24px)': 'blur-xl',
        'blur(40px)': 'blur-2xl',
        'blur(64px)': 'blur-3xl',
        'brightness(0)': 'brightness-0',
        'brightness(.5)': 'brightness-50',
        'brightness(.75)': 'brightness-75',
        'brightness(.9)': 'brightness-90',
        'brightness(.95)': 'brightness-95',
        'brightness(1)': 'brightness-100',
        'brightness(1.05)': 'brightness-105',
        'brightness(1.1)': 'brightness-110',
        'brightness(1.25)': 'brightness-125',
        'brightness(1.5)': 'brightness-150',
        'brightness(2)': 'brightness-200',
        'contrast(0)': 'contrast-0',
        'contrast(.5)': 'contrast-50',
        'contrast(.75)': 'contrast-75',
        'contrast(1)': 'contrast-100',
        'contrast(1.25)': 'contrast-125',
        'contrast(1.5)': 'contrast-150',
        'contrast(2)': 'contrast-200',
        'drop-shadow(0 1px 1px rgba(0,0,0,0.05))': 'drop-shadow-sm',
        'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.06))':
            'drop-shadow',
        'drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06))':
            'drop-shadow-md',
        'drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)) drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1))':
            'drop-shadow-lg',
        'drop-shadow(0 20px 13px rgba(0, 0, 0, 0.03)) drop-shadow(0 8px 5px rgba(0, 0, 0, 0.08))':
            'drop-shadow-xl',
        'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))': 'drop-shadow-2xl',
        'drop-shadow(0 0 #0000)': 'drop-shadow-none',
        'grayscale(0)': 'grayscale-0',
        'grayscale(1)': 'grayscale',
        'hue-rotate(-180deg)': '-hue-rotate-180',
        'hue-rotate(-90deg)': '-hue-rotate-90',
        'hue-rotate(-60deg)': '-hue-rotate-60',
        'hue-rotate(-30deg)': '-hue-rotate-30',
        'hue-rotate(-15deg)': '-hue-rotate-15',
        'hue-rotate(0deg)': 'hue-rotate-0',
        'hue-rotate(15deg)': 'hue-rotate-15',
        'hue-rotate(30deg)': 'hue-rotate-30',
        'hue-rotate(60deg)': 'hue-rotate-60',
        'hue-rotate(90deg)': 'hue-rotate-90',
        'hue-rotate(180deg)': 'hue-rotate-180',
        'invert(0)': 'invert-0',
        'invert(1)': 'invert',
        'saturate(0)': 'saturate-0',
        'saturate(.5)': 'saturate-50',
        'saturate(1)': 'saturate-100',
        'saturate(1.5)': 'saturate-150',
        'saturate(2)': 'saturate-200',
        'sepia(0)': 'sepia-0',
        'sepia(1)': 'sepia',
    }[val];
};

export const propertyMap: Map<
    string,
    Record<string, string> | ((val: string, isCustom?: boolean) => string)
> = new Map<string, Record<string, string> | ((val: string, isCustom?: boolean) => string)>([
    [
        'align-content',
        {
            center: 'content-center',
            'flex-start': 'content-start',
            'flex-end': 'content-end',
            'space-between': 'content-between',
            'space-around': 'content-around',
            'space-evenly': 'content-evenly',
        },
    ],
    [
        'align-items',
        {
            'flex-start': 'items-start',
            'flex-end': 'items-end',
            center: 'items-center',
            baseline: 'items-baseline',
            stretch: 'items-stretch',
        },
    ],
    [
        'align-self',
        {
            auto: 'self-auto',
            'flex-start': 'self-start',
            'flex-end': 'self-end',
            center: 'self-center',
            stretch: 'self-stretch',
            baseline: 'self-baseline',
        },
    ],
    [
        'all',
        {
            initial: '[all:initial]',
            inherit: '[all:inherit]',
            unset: '[all:unset]',
        },
    ],
    ['animation', (val) => ({ none: 'animate-none' })[val] ?? `animate-[${getCustomVal(val)}]`],
    ['animation-delay', (val) => `[animation-delay:${getCustomVal(val)}]`],
    ['animation-direction', (val) => `[animation-direction:${getCustomVal(val)}]`],
    ['animation-duration', (val) => `[animation-duration:${getCustomVal(val)}]`],
    ['animation-fill-mode', (val) => `[animation-fill-mode:${getCustomVal(val)}]`],
    ['animation-iteration-count', (val) => `[animation-iteration-count:${getCustomVal(val)}]`],
    ['animation-name', (val) => `[animation-name:${getCustomVal(val)}]`],
    ['animation-play-state', (val) => `[animation-play-state:${getCustomVal(val)}]`],
    ['animation-timing-function', (val) => `[animation-timing-function:${getCustomVal(val)}]`],
    [
        'appearance',
        (val) => ({ none: 'appearance-none' })[val] ?? `[appearance:${getCustomVal(val)}]`,
    ],
    ['aspect-ratio', (val) => `[aspect-ratio:${getCustomVal(val)}]`],
    [
        'backdrop-filter',
        (val) => {
            const defaultVal = { none: 'backdrop-filter-none' }[val];
            if (defaultVal) {
                return defaultVal;
            }

            const backdropFilterValConfig: Record<string, (v: string) => string> = {
                blur: (v: string) =>
                    `backdrop-blur-${customTheme['backdrop-blur']?.[v] ?? `[${v}]`}`,
                brightness: (v: string) =>
                    `backdrop-brightness-${customTheme['backdrop-brightness']?.[v] ?? `[${v}]`}`,
                contrast: (v: string) =>
                    `backdrop-contrast-${customTheme['backdrop-contrast']?.[v] ?? `[${v}]`}`,
                grayscale: (v: string) =>
                    `backdrop-grayscale-${customTheme['backdrop-grayscale']?.[v] ?? `[${v}]`}`,
                'hue-rotate': (v: string) => {
                    const t = hasNegative(v);
                    return `${t[0]}backdrop-hue-rotate-${customTheme['backdrop-grayscale']?.[t[1]] ?? `[${t[1]}]`}`;
                },
                invert: (v: string) =>
                    `backdrop-invert-${customTheme['backdrop-invert']?.[v] ?? `[${v}]`}`,
                opacity: (v: string) =>
                    `backdrop-opacity-${customTheme['backdrop-opacity']?.[v] ?? `[${v}]`}`,
                saturate: (v: string) =>
                    `backdrop-saturate-${customTheme['backdrop-saturate']?.[v] ?? `[${v}]`}`,
                sepia: (v: string) =>
                    `backdrop-sepia-${customTheme['backdrop-sepia']?.[v] ?? `[${v}]`}`,
            };
            const vals = getCustomVal(val)
                .replace(/\(.+?\)/g, (v) => v.replace(/_/g, ''))
                .split(')_')
                .map((v) => `${v})`);
            vals[vals.length - 1] = vals[vals.length - 1].slice(0, -1);

            let canUse = true;
            const res = vals.map((v) => {
                let canUsePipeV = false;
                let pipeV = '';
                if (useAllDefaultValues) {
                    pipeV =
                        (getFilterDefaultVal(v) ||
                            {
                                'opacity(0)': 'backdrop-opacity-0',
                                'opacity(0.05)': 'backdrop-opacity-5',
                                'opacity(0.1)': 'backdrop-opacity-10',
                                'opacity(0.2)': 'backdrop-opacity-20',
                                'opacity(0.25)': 'backdrop-opacity-25',
                                'opacity(0.3)': 'backdrop-opacity-30',
                                'opacity(0.4)': 'backdrop-opacity-40',
                                'opacity(0.5)': 'backdrop-opacity-50',
                                'opacity(0.6)': 'backdrop-opacity-60',
                                'opacity(0.7)': 'backdrop-opacity-70',
                                'opacity(0.75)': 'backdrop-opacity-75',
                                'opacity(0.8)': 'backdrop-opacity-80',
                                'opacity(0.9)': 'backdrop-opacity-90',
                                'opacity(0.95)': 'backdrop-opacity-95',
                                'opacity(1)': 'backdrop-opacity-100',
                            }[v]) ??
                        '';
                    if (pipeV.length > 0) {
                        pipeV = pipeV.startsWith('backdrop-opacity') ? pipeV : `backdrop-${pipeV}`;
                        canUsePipeV = true;
                    }
                }
                pipeV =
                    pipeV.length > 0
                        ? pipeV
                        : v.replace(/^([a-zA-Z0-9_-]+)\((.+?)\)$/, (r, k: string, v) => {
                              canUsePipeV = true;
                              return backdropFilterValConfig[k]?.(v) ?? (canUse = false);
                          });
                return canUsePipeV ? pipeV : '';
            });
            return canUse
                ? `backdrop-filter ${[...new Set(res)].join(' ')}`
                : `[backdrop-filter:${getCustomVal(val)}]`;
        },
    ],
    [
        'backface-visibility',
        {
            visible: '[backface-visibility:visible]',
            hidden: '[backface-visibility:hidden]',
        },
    ],
    [
        'background',
        (val) => {
            const legalConfig: Record<string, string> = {
                ...propertyMap.get('background-attachment'),
                ...propertyMap.get('background-repeat'),
                transparent: 'bg-transparent',
                currentColor: 'bg-current',
                currentcolor: 'bg-current',
                none: 'bg-none',
                bottom: 'bg-bottom',
                center: 'bg-center',
                left: 'bg-left',
                'left bottom': 'bg-left-bottom',
                'left top': 'bg-left-top',
                right: 'bg-right',
                'right bottom': 'bg-right-bottom',
                'right top': 'bg-right-top',
                top: 'bg-top',
                auto: 'bg-auto',
                cover: 'bg-cover',
                contain: 'bg-contain',
            };
            return legalConfig[val] ?? `bg-[${getCustomVal(val)}]`;
        },
    ],
    [
        'background-attachment',
        {
            fixed: 'bg-fixed',
            local: 'bg-local',
            scroll: 'bg-scroll',
        },
    ],
    [
        'background-blend-mode',
        {
            normal: 'bg-blend-normal',
            multiply: 'bg-blend-multiply',
            screen: 'bg-blend-screen',
            overlay: 'bg-blend-overlay',
            darken: 'bg-blend-darken',
            lighten: 'bg-blend-lighten',
            'color-dodge': 'bg-blend-color-dodge',
            'color-burn': 'bg-blend-color-burn',
            'hard-light': 'bg-blend-hard-light',
            'soft-light': 'bg-blend-soft-light',
            difference: 'bg-blend-difference',
            exclusion: 'bg-blend-exclusion',
            hue: 'bg-blend-hue',
            saturation: 'bg-blend-saturation',
            color: 'bg-blend-color',
            luminosity: 'bg-blend-luminosity',
        },
    ],
    [
        'background-clip',
        {
            'border-box': 'bg-clip-border',
            'padding-box': 'bg-clip-padding',
            'content-box': 'bg-clip-content',
            text: 'bg-clip-text',
        },
    ],
    [
        'background-color',
        (val, isCustom = false) =>
            ({
                transparent: 'bg-transparent',
                currentColor: 'bg-current',
                currentcolor: 'bg-current',
            })[val] ??
            (isCustom ? `bg-${val}` : isColor(val, true) ? `bg-[${getCustomVal(val)}]` : ''),
    ],
    ['background-image', (val) => ({ none: 'bg-none' })[val] ?? `bg-[${getCustomVal(val)}]`],
    [
        'background-origin',
        {
            'border-box': 'bg-origin-border',
            'padding-box': 'bg-origin-padding',
            'content-box': 'bg-origin-content',
        },
    ],
    [
        'background-position',
        (val) =>
            ({
                bottom: 'bg-bottom',
                center: 'bg-center',
                left: 'bg-left',
                'left bottom': 'bg-left-bottom',
                'left top': 'bg-left-top',
                right: 'bg-right',
                'right bottom': 'bg-right-bottom',
                'right top': 'bg-right-top',
                top: 'bg-top',
            })[val] ?? `bg-[${getCustomVal(val)}]`,
    ],
    [
        'background-repeat',
        {
            repeat: 'bg-repeat',
            'no-repeat': 'bg-no-repeat',
            'repeat-x': 'bg-repeat-x',
            'repeat-y': 'bg-repeat-y',
            round: 'bg-repeat-round',
            space: 'bg-repeat-space',
        },
    ],
    [
        'background-size',
        (val) =>
            ({
                auto: 'bg-auto',
                cover: 'bg-cover',
                contain: 'bg-contain',
            })[val] ?? `[background-size:${getCustomVal(val)}]`,
    ],
    [
        'border',
        (val) => {
            val = val.replace(/\(.+?\)/, (v) => v.replace(/\s/g, ''));
            const vals: string = val
                .split(' ')
                .filter((v) => v !== '')
                .map((v) =>
                    isUnit(v) || isColor(v)
                        ? ({
                              transparent: 'border-transparent',
                              currentColor: 'border-current',
                              currentcolor: 'border-current',
                          }[val] ??
                          (propertyMap.get('border-style') as Record<string, string>)[v] ??
                          `border-[${v}]`)
                        : ((propertyMap.get('border-style') as Record<string, string>)[v] ?? ''),
                )
                .filter((v) => v !== '')
                .join(' ');
            return vals;
        },
    ],
    [
        'border-bottom',
        (val) => {
            return `[border-bottom:${getCustomVal(val)}]`;
        },
    ],
    [
        'border-bottom-color',
        (val, isCustom = false) =>
            isCustom
                ? `[border-bottom-color:${val}]`
                : isColor(val, true)
                  ? `[border-bottom-color:${getCustomVal(val)}]`
                  : '',
    ],
    [
        'border-bottom-left-radius',
        (val) =>
            ({ '0': 'rounded-bl-none', '0px': 'rounded-bl-none' })[val] ??
            (isUnit(val)
                ? `rounded-bl${((useAllDefaultValues && getBorderRadiusDefaultVal(val)) || `-[${getCustomVal(val)}]`).replace(/null$/, '')}`
                : ''),
    ],
    [
        'border-bottom-right-radius',
        (val) =>
            ({ '0': 'rounded-br-none', '0px': 'rounded-br-none' })[val] ??
            (isUnit(val)
                ? `rounded-br${((useAllDefaultValues && getBorderRadiusDefaultVal(val)) || `-[${getCustomVal(val)}]`).replace(/null$/, '')}`
                : ''),
    ],
    [
        'border-bottom-style',
        (val) =>
            (propertyMap.get('border-style') as Record<string, string>)[val]
                ? `[border-bottom-style:${val}]`
                : '',
    ],
    ['border-bottom-width', (val) => (isUnit(val) ? `border-b-[${getCustomVal(val)}]` : '')],
    [
        'border-collapse',
        {
            collapse: 'border-collapse',
            separate: 'border-separate',
        },
    ],
    [
        'border-color',
        (val, isCustom = false) =>
            ({
                transparent: 'border-transparent',
                currentColor: 'border-current',
                currentcolor: 'border-current',
            })[val] ??
            (isCustom
                ? `border-${val}`
                : isColor(val, true)
                  ? `border-[${getCustomVal(val)}]`
                  : ''),
    ],
    ['border-image', (val) => `[border-image:${getCustomVal(val)}]`],
    ['border-image-outset', (val) => `[border-image-outset:${getCustomVal(val)}]`],
    ['border-image-repeat', (val) => `[border-image-repeat:${getCustomVal(val)}]`],
    ['border-image-slice', (val) => `[border-image-slice:${getCustomVal(val)}]`],
    ['border-image-source', (val) => `[border-image-source:${getCustomVal(val)}]`],
    [
        'border-image-width',
        (val) => (isUnit(val) ? `[border-image-width:${getCustomVal(val)}]` : ''),
    ],
    [
        'border-left',
        (val) => {
            return `[border-left:${getCustomVal(val)}]`;
        },
    ],
    [
        'border-left-color',
        (val, isCustom = false) =>
            isCustom
                ? `[border-left-color:${val}]`
                : isColor(val, true)
                  ? `[border-left-color:${getCustomVal(val)}]`
                  : '',
    ],
    [
        'border-left-style',
        (val) =>
            (propertyMap.get('border-style') as Record<string, string>)[val]
                ? `[border-left-style:${val}]`
                : '',
    ],
    ['border-left-width', (val) => (isUnit(val) ? `border-l-[${getCustomVal(val)}]` : '')],
    [
        'border-radius',
        (val) => {
            const r = { '0': 'rounded-none', '0px': 'rounded-none' }[val];
            if (r) {
                return r;
            }
            if (val.includes('/')) {
                return `rounded-[${getCustomVal(val)}]`;
            }
            let vals = val.split(' ').filter((v) => v !== '');
            if (vals.filter((v) => !isUnit(v)).length > 0) {
                return '';
            }
            vals = vals.map((v) =>
                ((useAllDefaultValues && getBorderRadiusDefaultVal(v)) || `-[${v}]`).replace(
                    /null$/,
                    '',
                ),
            );
            if (vals.length === 1) {
                return `rounded${vals[0]}`;
            } else if (vals.length === 2) {
                return `rounded-tl${vals[0]} rounded-br${vals[0]} rounded-tr${vals[1]} rounded-bl${vals[1]}`;
            } else if (vals.length === 3) {
                return `rounded-tl${vals[0]} rounded-br${vals[2]} rounded-tr${vals[1]} rounded-bl${vals[1]}`;
            } else if (vals.length === 4) {
                return `rounded-tl${vals[0]} rounded-br${vals[2]} rounded-tr${vals[1]} rounded-bl${vals[3]}`;
            }
            return '';
        },
    ],
    [
        'border-right',
        (val) => {
            return `[border-right:${getCustomVal(val)}]`;
        },
    ],
    [
        'border-right-color',
        (val, isCustom = false) =>
            isCustom
                ? `[border-right-color:${val}]`
                : isColor(val, true)
                  ? `[border-right-color:${getCustomVal(val)}]`
                  : '',
    ],
    [
        'border-right-style',
        (val) =>
            (propertyMap.get('border-style') as Record<string, string>)[val]
                ? `[border-right-style:${val}]`
                : '',
    ],
    ['border-right-width', (val) => (isUnit(val) ? `border-r-[${getCustomVal(val)}]` : '')],
    ['border-spacing', (val) => (isUnit(val) ? `[border-spacing:${getCustomVal(val)}]` : '')],
    [
        'border-style',
        {
            solid: 'border-solid',
            dashed: 'border-dashed',
            dotted: 'border-dotted',
            double: 'border-double',
            none: 'border-none',
        },
    ],
    [
        'border-top',
        (val) => {
            return `[border-top:${getCustomVal(val)}]`;
        },
    ],
    [
        'border-top-color',
        (val, isCustom = false) =>
            isCustom
                ? `[border-top-color:${val}]`
                : isColor(val, true)
                  ? `[border-top-color:${getCustomVal(val)}]`
                  : '',
    ],
    [
        'border-top-left-radius',
        (val) =>
            ({ '0': 'rounded-tl-none', '0px': 'rounded-tl-none' })[val] ??
            (isUnit(val)
                ? `rounded-tl${((useAllDefaultValues && getBorderRadiusDefaultVal(val)) || `-[${getCustomVal(val)}]`).replace(/null$/, '')}`
                : ''),
    ],
    [
        'border-top-right-radius',
        (val) =>
            ({ '0': 'rounded-tr-none', '0px': 'rounded-tr-none' })[val] ??
            (isUnit(val)
                ? `rounded-tr${((useAllDefaultValues && getBorderRadiusDefaultVal(val)) || `-[${getCustomVal(val)}]`).replace(/null$/, '')}`
                : ''),
    ],
    [
        'border-top-style',
        (val) =>
            (propertyMap.get('border-style') as Record<string, string>)[val]
                ? `[border-top-style:${val}]`
                : '',
    ],
    ['border-top-width', (val) => (isUnit(val) ? `border-t-[${getCustomVal(val)}]` : '')],
    ['border-width', (val) => (isUnit(val) ? `border-[${getCustomVal(val)}]` : '')],
    [
        'bottom',
        (val) => {
            const t = hasNegative(val);
            return isUnit(val)
                ? `${t[0]}bottom-${getUnitMetacharactersVal(t[1], [CustomSelect.vw, CustomSelect.vh]) || `[${t[1]}]`}`
                : '';
        },
    ],
    [
        'box-align',
        {
            initial: '[box-align:initial]',
            start: '[box-align:inherit]',
            end: '[box-align:unset]',
            center: '[box-align:unset]',
            baseline: '[box-align:unset]',
            stretch: '[box-align:unset]',
        },
    ],
    [
        'box-decoration-break',
        {
            slice: 'decoration-slice',
            clone: 'decoration-clone',
        },
    ],
    [
        'box-direction',
        {
            initial: '[box-direction:initial]',
            normal: '[box-direction:normal]',
            reverse: '[box-direction:reverse]',
            inherit: '[box-direction:inherit]',
        },
    ],
    ['box-flex', (val) => `[box-flex:${getCustomVal(val)}]`],
    ['box-flex-group', (val) => `[box-flex-group:${getCustomVal(val)}]`],
    [
        'box-lines',
        {
            single: '[box-lines:single]',
            multiple: '[box-lines:multiple]',
            initial: '[box-lines:initial]',
        },
    ],
    ['box-ordinal-group', (val) => `[box-ordinal-group:${getCustomVal(val)}]`],
    [
        'box-orient',
        {
            horizontal: '[box-orient:horizontal]',
            vertical: '[box-orient:vertical]',
            'inline-axis': '[box-orient:inline-axis]',
            'block-axis': '[box-orient:block-axis]',
            inherit: '[box-orient:inherit]',
            initial: '[box-orient:initial]',
        },
    ],
    [
        'box-pack',
        {
            start: '[box-pack:start]',
            end: '[box-pack:end]',
            center: '[box-pack:center]',
            justify: '[box-pack:justify]',
            initial: '[box-pack:initial]',
        },
    ],
    ['box-shadow', (val) => `[box-shadow:${getCustomVal(val)}]`],
    [
        'box-sizing',
        {
            'border-box': 'box-border',
            'content-box': 'box-content',
        },
    ],
    [
        'caption-side',
        {
            top: '[caption-side:top]',
            bottom: '[caption-side:bottom]',
            inherit: '[caption-side:inherit]',
            initial: '[caption-side:initial]',
        },
    ],
    [
        'clear',
        {
            left: 'clear-left',
            right: 'clear-right',
            both: 'clear-both',
            none: 'clear-none',
        },
    ],
    ['clip', (val) => `[clip:${getCustomVal(val)}]`],
    ['clip-path', (val) => `[clip-path:${getCustomVal(val)}]`],
    [
        'color',
        (val, isCustom = false) =>
            ({
                transparent: 'text-transparent',
                currentColor: 'text-current',
                currentcolor: 'text-current',
            })[val] ??
            (isCustom ? `text-${val}` : isColor(val, true) ? `text-[${getCustomVal(val)}]` : ''),
    ],
    ['color-scheme', (val) => `[color-scheme:${getCustomVal(val)}]`],
    ['column-count', (val) => `[column-count:${getCustomVal(val)}]`],
    [
        'column-fill',
        {
            balance: '[column-fill:balance]',
            auto: '[column-fill:auto]',
            initial: '[column-fill:initial]',
        },
    ],
    ['column-gap', (val) => ({ '0': 'gap-x-0' })[val] ?? (isUnit(val) ? `gap-x-[${val}]` : '')],
    ['column-rule', (val) => `[column-rule:${getCustomVal(val)}]`],
    [
        'column-rule-color',
        (val, isCustom = false) =>
            isCustom
                ? `[column-rule-color:${val}]`
                : isColor(val, true)
                  ? `[column-rule-color:${getCustomVal(val)}]`
                  : '',
    ],
    [
        'column-rule-style',
        {
            none: '[column-rule-style:none]',
            hidden: '[column-rule-style:hidden]',
            dotted: '[column-rule-style:dotted]',
            dashed: '[column-rule-style:dashed]',
            solid: '[column-rule-style:solid]',
            double: '[column-rule-style:double]',
            groove: '[column-rule-style:groove]',
            ridge: '[column-rule-style:ridge]',
            inset: '[column-rule-style:inset]',
            outset: '[column-rule-style:outset]',
            initial: '[column-rule-style:initial]',
        },
    ],
    ['column-rule-width', (val) => (isUnit(val) ? `[column-rule-width:${val}]` : '')],
    ['column-span', (val) => `[column-span:${getCustomVal(val)}]`],
    ['column-width', (val) => (isUnit(val) ? `[column-width:${val}]` : '')],
    ['columns', (val) => `[columns:${getCustomVal(val)}]`],
    ['contain-intrinsic-size', (val) => `[contain-intrinsic-size:${getCustomVal(val)}]`],
    ['content', (val) => `content-[${getCustomVal(val)}]`],
    ['content-visibility', (val) => `[content-visibility:${getCustomVal(val)}]`],
    ['counter-increment', (val) => `[content-increment:${getCustomVal(val)}]`],
    ['counter-reset', (val) => `[counter-reset:${getCustomVal(val)}]`],
    ['counter-set', (val) => `[counter-set:${getCustomVal(val)}]`],
    [
        'cursor',
        {
            auto: 'cursor-auto',
            default: 'cursor-default',
            pointer: 'cursor-pointer',
            wait: 'cursor-wait',
            text: 'cursor-text',
            move: 'cursor-move',
            help: 'cursor-help',
            'not-allowed': 'cursor-not-allowed',
        },
    ],
    [
        'direction',
        {
            ltr: '[direction:ltr]',
            rtl: '[direction:rtl]',
            inherit: '[direction:inherit]',
            initial: '[direction:initial]',
        },
    ],
    [
        'display',
        {
            block: 'block',
            'inline-block': 'inline-block',
            inline: 'inline',
            flex: 'flex',
            'inline-flex': 'inline-flex',
            table: 'table',
            'inline-table': 'inline-table',
            'table-caption': 'table-caption',
            'table-cell': 'table-cell',
            'table-column': 'table-column',
            'table-column-group': 'table-column-group',
            'table-footer-group': 'table-footer-group',
            'table-header-group': 'table-header-group',
            'table-row-group': 'table-row-group',
            'table-row': 'table-row',
            'flow-root': 'flow-root',
            grid: 'grid',
            'inline-grid': 'inline-grid',
            contents: 'contents',
            'list-item': 'list-item',
            none: 'hidden',
        },
    ],
    [
        'empty-cells',
        {
            hide: '[empty-cells:hide]',
            show: '[empty-cells:show]',
            inherit: '[empty-cells:inherit]',
            initial: '[empty-cells:initial]',
        },
    ],
    [
        'fill',
        (val, isCustom = false) =>
            ({ currentColor: 'fill-current', currentcolor: 'fill-current' })[val] ??
            (isCustom ? `fill-${val}` : isColor(val, true) ? `fill-[${getCustomVal(val)}]` : ''),
    ],
    [
        'filter',
        (val) => {
            const defaultVal = { none: 'filter-none' }[val];
            if (defaultVal) {
                return defaultVal;
            }
            const filterValConfig: Record<string, (v: string) => string> = {
                blur: (v: string) => `blur-${customTheme['blur']?.[v] ?? `[${v}]`}`,
                brightness: (v: string) =>
                    `brightness-${customTheme['brightness']?.[v] ?? `[${v}]`}`,
                contrast: (v: string) => `contrast-${customTheme['contrast']?.[v] ?? `[${v}]`}`,
                grayscale: (v: string) => `grayscale-${customTheme['grayscale']?.[v] ?? `[${v}]`}`,
                'hue-rotate': (v: string) => {
                    const t = hasNegative(v);
                    return `${t[0]}hue-rotate-${customTheme['grayscale']?.[t[1]] ?? `[${t[1]}]`}`;
                },
                invert: (v: string) => `invert-${customTheme['invert']?.[v] ?? `[${v}]`}`,
                saturate: (v: string) => `saturate-${customTheme['saturate']?.[v] ?? `[${v}]`}`,
                sepia: (v: string) => `sepia-${customTheme['sepia']?.[v] ?? `[${v}]`}`,
            };
            const vals = getCustomVal(val)
                .replace(/\(.+?\)/g, (v) => v.replace(/_/g, ''))
                .split(')_')
                .map((v) => `${v})`);
            vals[vals.length - 1] = vals[vals.length - 1].slice(0, -1);

            let canUse = true;
            const res = vals.map((v) => {
                let canUsePipeV = false;
                let pipeV = '';
                if (useAllDefaultValues) {
                    pipeV = getFilterDefaultVal(v) ?? '';
                    if (pipeV.length > 0) {
                        canUsePipeV = true;
                    }
                }
                pipeV =
                    pipeV.length > 0
                        ? pipeV
                        : v.replace(/^([a-zA-Z0-9_-]+)\((.+?)\)$/, (r, k: string, v) => {
                              canUsePipeV = true;
                              return filterValConfig[k]?.(v) ?? (canUse = false);
                          });
                return canUsePipeV ? pipeV : '';
            });
            return canUse
                ? `filter ${[...new Set(res)].join(' ')}`
                : `[filter:${getCustomVal(val)}]`;
        },
    ],
    [
        'flex',
        (val) =>
            ({
                '1 1 0%': 'flex-1',
                '1 1 auto': 'flex-auto',
                '0 1 auto': 'flex-initial',
                none: 'flex-none',
            })[val] ?? `flex-[${getCustomVal(val)}]`,
    ],
    ['flex-basis', (val) => (isUnit(val) ? `[flex-basis:${val}]` : '')],
    [
        'flex-direction',
        {
            row: 'flex-row',
            'row-reverse': 'flex-row-reverse',
            column: 'flex-col',
            'column-reverse': 'flex-col-reverse',
        },
    ],
    ['flex-flow', (val) => `[flex-flow:${getCustomVal(val)}]`],
    [
        'flex-grow',
        (val) =>
            isUnit(val)
                ? ({ '0': 'flex-grow-0', '1': 'flex-grow' }[val] ?? `flex-grow-[${val}]`)
                : '',
    ],
    [
        'flex-shrink',
        (val) =>
            isUnit(val)
                ? ({ '0': 'flex-shrink-0', '1': 'flex-shrink' }[val] ?? `flex-shrink-[${val}]`)
                : '',
    ],
    [
        'flex-wrap',
        {
            wrap: 'flex-wrap',
            'wrap-reverse': 'flex-wrap-reverse',
            nowrap: 'flex-nowrap',
        },
    ],
    [
        'float',
        {
            right: 'float-right',
            left: 'float-left',
            none: 'float-none',
        },
    ],
    ['font', (val) => `[font:${getCustomVal(val)}]`],
    ['font-family', (val) => `font-[${getCustomVal(val)}]`],
    ['font-size', (val) => (isUnit(val) ? `text-[${val}]` : '')],
    ['font-size-adjust', (val) => (isUnit(val) ? `[font-size-adjust:${val}]` : '')],
    [
        '-webkit-font-smoothing',
        {
            antialiased: 'antialiased',
            auto: 'subpixel-antialiased',
        },
    ],
    [
        '-moz-osx-font-smoothing',
        {
            grayscale: 'antialiased',
            auto: 'subpixel-antialiased',
        },
    ],
    [
        'font-stretch',
        {
            wider: '[font-stretch:wider]',
            narrower: '[font-stretch:narrower]',
            'ultra-condensed': '[font-stretch:ultra-condensed]',
            'extra-condensed': '[font-stretch:extra-condensed]',
            condensed: '[font-stretch:condensed]',
            'semi-condensed': '[font-stretch:semi-condensed]',
            normal: '[font-stretch:normal]',
            'semi-expanded': '[font-stretch:semi-expanded]',
            expanded: '[font-stretch:expanded]',
            'extra-expanded': '[font-stretch:extra-expanded]',
            'ultra-expanded': '[font-stretch:ultra-expanded]',
            inherit: '[font-stretch:inherit]',
            initial: '[font-stretch:initial]',
        },
    ],
    [
        'font-style',
        {
            italic: 'italic',
            normal: 'not-italic',
        },
    ],
    [
        'font-variant',
        {
            normal: '[font-variant:normal]',
            'small-caps': '[font-variant:small-caps]',
            inherit: '[font-variant:inherit]',
            initial: '[font-variant:initial]',
        },
    ],
    [
        'font-variant-numeric',
        {
            normal: 'normal-nums',
            ordinal: 'ordinal',
            'slashed-zero': 'slashed-zero',
            'lining-nums': 'lining-nums',
            'oldstyle-nums': 'oldstyle-nums',
            'proportional-nums': 'proportional-nums',
            'tabular-nums': 'tabular-nums',
            'diagonal-fractions': 'diagonal-fractions',
            'stacked-fractions': 'stacked-fractions',
        },
    ],
    ['font-variation-settings', (val) => `[font-variation-settings:${getCustomVal(val)}]`],
    ['font-weight', (val) => (isUnit(val) ? `font-[${val}]` : '')],
    ['gap', (val) => ({ '0': 'gap-0' })[val] ?? (isUnit(val) ? `gap-[${val}]` : '')],
    ['grid', (val) => `[grid:${getCustomVal(val)}]`],
    ['grid-area', (val) => `[grid-area:${getCustomVal(val)}]`],
    [
        'grid-auto-columns',
        (val) =>
            ({
                auto: 'auto-cols-auto',
                'min-content': 'auto-cols-min',
                'max-content': 'auto-cols-max',
                'minmax(0, 1fr)': 'auto-cols-fr',
            })[val] ?? `auto-cols-[${getCustomVal(val)}]`,
    ],
    [
        'grid-auto-flow',
        (val) =>
            ({
                row: 'grid-flow-row',
                column: 'grid-flow-col',
                row_dense: 'grid-flow-row-dense',
                column_dense: 'grid-flow-col-dense',
            })[getCustomVal(val)] ?? '',
    ],
    [
        'grid-auto-rows',
        (val) =>
            ({
                auto: 'auto-rows-auto',
                'min-content': 'auto-rows-min',
                'max-content': 'auto-rows-max',
                'minmax(0, 1fr)': 'auto-rows-fr',
            })[val] ?? `auto-rows-[${getCustomVal(val)}]`,
    ],
    [
        'grid-column',
        (val) =>
            ({
                auto: 'col-auto',
                'span 1 / span 1': 'col-span-1',
                'span 2 / span 2': 'col-span-2',
                'span 3 / span 3': 'col-span-3',
                'span 4 / span 4': 'col-span-4',
                'span 5 / span 5': 'col-span-5',
                'span 6 / span 6': 'col-span-6',
                'span 7 / span 7': 'col-span-7',
                'span 8 / span 8': 'col-span-8',
                'span 9 / span 9': 'col-span-9',
                'span 10 / span 10': 'col-span-10',
                'span 11 / span 11': 'col-span-11',
                'span 12 / span 12': 'col-span-12',
                '1 / -1': 'col-span-full',
            })[val] ?? `col-[${getCustomVal(val)}]`,
    ],
    [
        'grid-column-end',
        (val) =>
            ({
                '1': 'col-end-1',
                '2': 'col-end-2',
                '3': 'col-end-3',
                '4': 'col-end-4',
                '5': 'col-end-5',
                '6': 'col-end-6',
                '7': 'col-end-7',
                '8': 'col-end-8',
                '9': 'col-end-9',
                '10': 'col-end-10',
                '11': 'col-end-11',
                '12': 'col-end-12',
                '13': 'col-end-13',
                auto: 'col-end-auto',
            })[val] ?? `col-end-[${getCustomVal(val)}]`,
    ],
    [
        'grid-column-gap',
        (val) => ({ '0': 'gap-x-0' })[val] ?? (isUnit(val) ? `gap-x-[${val}]` : ''),
    ],
    [
        'grid-column-start',
        (val) =>
            ({
                '1': 'col-start-1',
                '2': 'col-start-2',
                '3': 'col-start-3',
                '4': 'col-start-4',
                '5': 'col-start-5',
                '6': 'col-start-6',
                '7': 'col-start-7',
                '8': 'col-start-8',
                '9': 'col-start-9',
                '10': 'col-start-10',
                '11': 'col-start-11',
                '12': 'col-start-12',
                '13': 'col-start-13',
                auto: 'col-start-auto',
            })[val] ?? `col-start-[${getCustomVal(val)}]`,
    ],
    ['grid-gap', (val) => ({ '0': 'gap-0' })[val] ?? (isUnit(val) ? `gap-[${val}]` : '')],
    [
        'grid-row',
        (val) =>
            ({
                auto: 'row-auto',
                'span 1 / span 1': 'row-span-1',
                'span 2 / span 2': 'row-span-2',
                'span 3 / span 3': 'row-span-3',
                'span 4 / span 4': 'row-span-4',
                'span 5 / span 5': 'row-span-5',
                'span 6 / span 6': 'row-span-6',
                '1 / -1': 'row-span-full',
            })[val] ?? `row-[${getCustomVal(val)}]`,
    ],
    [
        'grid-row-end',
        (val) =>
            ({
                '1': 'row-end-1',
                '2': 'row-end-2',
                '3': 'row-end-3',
                '4': 'row-end-4',
                '5': 'row-end-5',
                '6': 'row-end-6',
                '7': 'row-end-7',
                auto: 'row-end-auto',
            })[val] ?? `row-end-[${getCustomVal(val)}]`,
    ],
    ['grid-row-gap', (val) => ({ '0': 'gap-y-0' })[val] ?? (isUnit(val) ? `gap-y-[${val}]` : '')],
    [
        'grid-row-start',
        (val) =>
            ({
                '1': 'row-start-1',
                '2': 'row-start-2',
                '3': 'row-start-3',
                '4': 'row-start-4',
                '5': 'row-start-5',
                '6': 'row-start-6',
                '7': 'row-start-7',
                auto: 'row-start-auto',
            })[val] ?? `row-start-[${getCustomVal(val)}]`,
    ],
    ['grid-rows', (val) => `[grid-rows:${getCustomVal(val)}]`],
    ['grid-template', (val) => `[grid-template:${getCustomVal(val)}]`],
    ['grid-template-areas', (val) => `[grid-template-areas:${getCustomVal(val)}]`],
    [
        'grid-template-columns',
        (val) =>
            ({
                'repeat(1,minmax(0,1fr))': 'grid-cols-1',
                'repeat(2,minmax(0,1fr))': 'grid-cols-2',
                'repeat(3,minmax(0,1fr))': 'grid-cols-3',
                'repeat(4,minmax(0,1fr))': 'grid-cols-4',
                'repeat(5,minmax(0,1fr))': 'grid-cols-5',
                'repeat(6,minmax(0,1fr))': 'grid-cols-6',
                'repeat(7,minmax(0,1fr))': 'grid-cols-7',
                'repeat(8,minmax(0,1fr))': 'grid-cols-8',
                'repeat(9,minmax(0,1fr))': 'grid-cols-9',
                'repeat(10,minmax(0,1fr))': 'grid-cols-10',
                'repeat(11,minmax(0,1fr))': 'grid-cols-11',
                'repeat(12,minmax(0,1fr))': 'grid-cols-12',
                none: 'grid-cols-none',
            })[getCustomVal(val).replace(/_/g, '')] ?? `grid-cols-[${getCustomVal(val)}]`,
    ],
    [
        'grid-template-rows',
        (val) =>
            ({
                'repeat(1,minmax(0,1fr))': 'grid-rows-1',
                'repeat(2,minmax(0,1fr))': 'grid-rows-2',
                'repeat(3,minmax(0,1fr))': 'grid-rows-3',
                'repeat(4,minmax(0,1fr))': 'grid-rows-4',
                'repeat(5,minmax(0,1fr))': 'grid-rows-5',
                'repeat(6,minmax(0,1fr))': 'grid-rows-6',
                none: 'grid-rows-none',
            })[getCustomVal(val).replace(/_/g, '')] ?? `grid-rows-[${getCustomVal(val)}]`,
    ],
    [
        'hanging-punctuation',
        {
            none: '[hanging-punctuation:none]',
            first: '[hanging-punctuation:first]',
            last: '[hanging-punctuation:last]',
            'allow-end': '[hanging-punctuation:allow-end]',
            'force-end': '[hanging-punctuation:force-end]',
            initial: '[hanging-punctuation:initial]',
        },
    ],
    [
        'height',
        (val) =>
            isUnit(val)
                ? `h-${(useAllDefaultValues && getRemDefaultVal(val)) || getUnitMetacharactersVal(val, [CustomSelect.vw]) || `[${val}]`}`
                : '',
    ],
    ['icon', (val) => `[icon:${getCustomVal(val)}]`],
    ['image-orientation', (val) => `[image-orientation:${getCustomVal(val)}]`],
    [
        'justify-content',
        {
            'flex-start': 'justify-start',
            'flex-end': 'justify-end',
            center: 'justify-center',
            'space-between': 'justify-between',
            'space-around': 'justify-around',
            'space-evenly': 'justify-evenly',
        },
    ],
    [
        'justify-items',
        {
            start: 'justify-items-start',
            end: 'justify-items-end',
            center: 'justify-items-center',
            stretch: 'justify-items-stretch',
        },
    ],
    [
        'justify-self',
        {
            auto: 'justify-self-auto',
            start: 'justify-self-start',
            end: 'justify-self-end',
            center: 'justify-self-center',
            stretch: 'justify-self-stretch',
        },
    ],
    [
        'left',
        (val) => {
            const t = hasNegative(val);
            return isUnit(val)
                ? `${t[0]}left-${getUnitMetacharactersVal(t[1], [CustomSelect.vw, CustomSelect.vh]) || `[${t[1]}]`}`
                : '';
        },
    ],
    [
        'letter-spacing',
        (val) =>
            ({
                '-0.05em': 'tracking-tighter',
                '-0.025em': 'tracking-tight',
                '0em': 'tracking-normal',
                '0.025em': 'tracking-wide',
                '0.05em': 'tracking-wider',
                '0.1em': 'tracking-widest',
            })[val] ?? (isUnit(val) ? `tracking-[${val}]` : ''),
    ],
    [
        'line-height',
        (val) =>
            ({
                '1': 'leading-none',
                '2': 'leading-loose',
                '1.25': 'leading-tight',
                '1.375': 'leading-snug',
                '1.5': 'leading-normal',
                '1.625': 'leading-relaxed',
            })[val] ?? (isUnit(val) ? `leading-[${val}]` : ''),
    ],
    ['list-style', (val) => `[list-style:${getCustomVal(val)}]`],
    ['list-style-image', (val) => `[list-style-image:${getCustomVal(val)}]`],
    [
        'list-style-position',
        (val) =>
            ({
                inside: 'list-inside',
                outside: 'list-outside',
            })[val] ?? `[list-style-position:${getCustomVal(val)}]`,
    ],
    [
        'list-style-type',
        (val) =>
            ({
                none: 'list-none',
                disc: 'list-disc',
                decimal: 'list-decimal',
            })[val] ?? `list-[${getCustomVal(val)}]`,
    ],
    ['logical-height', (val) => (isUnit(val) ? `[logical-height:${val}]` : '')],
    ['logical-width', (val) => (isUnit(val) ? `[logical-width:${val}]` : '')],
    [
        'isolation',
        {
            isolate: 'isolate',
            auto: 'isolation-auto',
        },
    ],
    [
        'margin',
        (val) => {
            const getPipeVal = (val: string) => {
                const r = { '0': 'm_0', '0px': 'm_0', auto: 'm_auto' }[val];
                if (r) {
                    return r;
                }
                let vals = val.split(' ').filter((v) => v !== '');
                if (vals.filter((v) => !isUnit(v)).length > 0) {
                    return '';
                }
                if (useAllDefaultValues) {
                    vals = vals.map((v) => getRemDefaultVal(v) ?? `[${v}]`);
                } else {
                    vals = vals.map((v) => `[${v}]`);
                }
                if (vals.length === 1 || new Set(vals).size === 1) {
                    return `m_${vals[0]}`;
                } else if (vals.length === 2) {
                    return `mx_${vals[1]} my_${vals[0]}`;
                } else if (vals.length === 3) {
                    if (vals[0] === vals[2]) {
                        return `mx_${vals[1]} my_${vals[0]}`;
                    }
                    return `mt_${vals[0]} mx_${vals[1]} mb_${vals[2]}`;
                } else if (vals.length === 4) {
                    if (vals[0] === vals[2]) {
                        if (vals[1] === vals[3]) {
                            return `mx_${vals[1]} my_${vals[0]}`;
                        }
                        return `ml_${vals[3]} mr_${vals[1]} my_${vals[0]}`;
                    }
                    if (vals[1] === vals[3]) {
                        if (vals[0] === vals[2]) {
                            return `mx_${vals[1]} my_${vals[0]}`;
                        }
                        return `ml_${vals[3]} mr_${vals[1]} my_${vals[0]}`;
                    }
                    return `mt_${vals[0]} mr_${vals[1]} mb_${vals[2]} ml_${vals[3]}`;
                }
                return '';
            };
            const v = getPipeVal(val);
            return v === ''
                ? ''
                : v
                      .split(' ')
                      .map((t) =>
                          t.includes('-')
                              ? `-${t.replace('-', '').replace('_', '-')}`
                              : t.replace('_', '-'),
                      )
                      .join(' ');
        },
    ],
    [
        'margin-bottom',
        (val) => {
            const t = hasNegative(val);
            return (
                { '0': 'mb-0', '0px': 'mb-0', auto: 'mb-auto' }[val] ??
                (isUnit(val)
                    ? `${t[0]}mb-${(useAllDefaultValues && getRemDefaultVal(t[1])) || `[${t[1]}]`}`
                    : '')
            );
        },
    ],
    [
        'margin-left',
        (val) => {
            const t = hasNegative(val);
            return (
                { '0': 'ml-0', '0px': 'ml-0', auto: 'ml-auto' }[val] ??
                (isUnit(val)
                    ? `${t[0]}ml-${(useAllDefaultValues && getRemDefaultVal(t[1])) || `[${t[1]}]`}`
                    : '')
            );
        },
    ],
    [
        'margin-right',
        (val) => {
            const t = hasNegative(val);
            return (
                { '0': 'mr-0', '0px': 'mr-0', auto: 'mr-auto' }[val] ??
                (isUnit(val)
                    ? `${t[0]}mr-${(useAllDefaultValues && getRemDefaultVal(t[1])) || `[${t[1]}]`}`
                    : '')
            );
        },
    ],
    [
        'margin-top',
        (val) => {
            const t = hasNegative(val);
            return (
                { '0': 'mt-0', '0px': 'mt-0', auto: 'mt-auto' }[val] ??
                (isUnit(val)
                    ? `${t[0]}mt-${(useAllDefaultValues && getRemDefaultVal(t[1])) || `[${t[1]}]`}`
                    : '')
            );
        },
    ],
    ['mask', (val) => `[mask:${getCustomVal(val)}]`],
    ['mask-clip', (val) => `[mask-clip:${getCustomVal(val)}]`],
    ['mask-composite', (val) => `[mask-composite:${getCustomVal(val)}]`],
    ['mask-image', (val) => `[mask-image:${getCustomVal(val)}]`],
    ['mask-origin', (val) => `[mask-origin:${getCustomVal(val)}]`],
    ['mask-position', (val) => `[mask-position:${getCustomVal(val)}]`],
    ['mask-repeat', (val) => `[mask-repeat:${getCustomVal(val)}]`],
    ['mask-size', (val) => `[mask-size:${getCustomVal(val)}]`],
    [
        'max-height',
        (val) =>
            isUnit(val)
                ? ({ '0px': 'max-h-0', '100%': 'max-h-full', '100vh': 'max-h-screen' }[val] ??
                  `max-h-[${val}]`)
                : '',
    ],
    [
        'max-width',
        (val) =>
            isUnit(val)
                ? ({
                      none: 'max-w-none',
                      '100%': 'max-w-full',
                      'min-content': 'max-w-min',
                      'max-content': 'max-w-max',
                  }[val] ?? `max-w-[${val}]`)
                : '',
    ],
    [
        'min-height',
        (val) =>
            isUnit(val)
                ? ({ '0px': 'min-h-0', '100%': 'min-h-full', '100vh': 'min-h-screen' }[val] ??
                  `min-h-[${val}]`)
                : '',
    ],
    [
        'min-width',
        (val) =>
            isUnit(val)
                ? ({
                      '0px': 'min-w-0',
                      '100%': 'min-w-full',
                      'min-content': 'min-w-min',
                      'max-content': 'min-w-max',
                  }[val] ?? `min-w-[${val}]`)
                : '',
    ],
    [
        'mix-blend-mode',
        {
            normal: 'mix-blend-normal',
            multiply: 'mix-blend-multiply',
            screen: 'mix-blend-screen',
            overlay: 'mix-blend-overlay',
            darken: 'mix-blend-darken',
            lighten: 'mix-blend-lighten',
            'color-dodge': 'mix-blend-color-dodge',
            'color-burn': 'mix-blend-color-burn',
            'hard-light': 'mix-blend-hard-light',
            'soft-light': 'mix-blend-soft-light',
            difference: 'mix-blend-difference',
            exclusion: 'mix-blend-exclusion',
            hue: 'mix-blend-hue',
            saturation: 'mix-blend-saturation',
            color: 'mix-blend-color',
            luminosity: 'mix-blend-luminosity',
        },
    ],
    ['nav-down', (val) => `[nav-down:${getCustomVal(val)}]`],
    ['nav-index', (val) => (isUnit(val) ? `[nav-index:${val}]` : '')],
    ['nav-left', (val) => (isUnit(val) ? `[nav-left:${val}]` : '')],
    ['nav-right', (val) => (isUnit(val) ? `[nav-right:${val}]` : '')],
    ['nav-up', (val) => (isUnit(val) ? `[nav-up:${val}]` : '')],
    [
        'object-fit',
        {
            contain: 'object-contain',
            cover: 'object-cover',
            fill: 'object-fill',
            none: 'object-none',
            'scale-down': 'object-scale-down',
        },
    ],
    [
        'object-position',
        (val) =>
            ({
                bottom: 'object-bottom',
                center: 'object-center',
                left: 'object-left',
                left_bottom: 'object-left-bottom',
                left_top: 'object-left-top',
                right: 'object-right',
                right_bottom: 'object-right-bottom',
                right_top: 'object-right-top',
                top: 'object-top',
            })[getCustomVal(val)] ?? '',
    ],
    [
        'opacity',
        (val) =>
            ({
                '0': 'opacity-0',
                '1': 'opacity-100',
                '0.05': 'opacity-5',
                '0.1': 'opacity-10',
                '0.2': 'opacity-20',
                '0.25': 'opacity-25',
                '0.3': 'opacity-30',
                '0.4': 'opacity-40',
                '0.5': 'opacity-50',
                '0.6': 'opacity-60',
                '0.7': 'opacity-70',
                '0.75': 'opacity-75',
                '0.8': 'opacity-80',
                '0.9': 'opacity-90',
                '0.95': 'opacity-95',
            })[val] ?? (isUnit(val) ? `opacity-[${val}]` : ''),
    ],
    [
        'order',
        (val) =>
            ({
                '0': 'order-none',
                '1': 'order-1',
                '2': 'order-2',
                '3': 'order-3',
                '4': 'order-4',
                '5': 'order-5',
                '6': 'order-6',
                '7': 'order-7',
                '8': 'order-8',
                '9': 'order-9',
                '10': 'order-10',
                '11': 'order-11',
                '12': 'order-12',
                '9999': 'order-last',
                '-9999': 'order-first',
            })[val] ?? (isUnit(val) ? `order-[${val}]` : ''),
    ],
    ['outline', (val) => `outline-[${getCustomVal(val)}]`],
    [
        'outline-color',
        (val, isCustom = false) =>
            isCustom
                ? `outline-${val}`
                : isColor(val, true)
                  ? `outline-[${getCustomVal(val)}]`
                  : '',
    ],
    ['outline-offset', (val) => (isUnit(val) ? `outline-offset-[${val}]` : '')],
    [
        'outline-style',
        {
            none: 'outline-[none]',
            dotted: 'outline-dotted',
            dashed: 'outline-dashed',
            solid: '[outline-style:solid]',
            double: 'outline-double',
            groove: '[outline-style:groove]',
            ridge: '[outline-style:ridge]',
            inset: '[outline-style:inset]',
            outset: '[outline-style:outset]',
        },
    ],
    ['outline-width', (val) => (isUnit(val) ? `outline-[${val}]` : '')],
    [
        'overflow',
        {
            auto: 'overflow-auto',
            hidden: 'overflow-hidden',
            visible: 'overflow-visible',
            scroll: 'overflow-scroll',
        },
    ],
    ['overflow-anchor', (val) => `[overflow-anchor:${getCustomVal(val)}]`],
    [
        'overflow-wrap',
        (val) => ({ 'break-word': 'break-words' })[val] ?? `[overflow-wrap:${getCustomVal(val)}]`,
    ],
    [
        'overflow-x',
        {
            auto: 'overflow-x-auto',
            hidden: 'overflow-x-hidden',
            visible: 'overflow-x-visible',
            scroll: 'overflow-x-scroll',
        },
    ],
    [
        'overflow-y',
        {
            auto: 'overflow-y-auto',
            hidden: 'overflow-y-hidden',
            visible: 'overflow-y-visible',
            scroll: 'overflow-y-scroll',
        },
    ],
    [
        'overscroll-behavior',
        {
            auto: 'overscroll-auto',
            contain: 'overscroll-contain',
            none: 'overscroll-none',
        },
    ],
    [
        'overscroll-behavior-x',
        {
            auto: 'overscroll-x-auto',
            contain: 'overscroll-x-contain',
            none: 'overscroll-x-none',
        },
    ],
    [
        'overscroll-behavior-y',
        {
            auto: 'overscroll-y-auto',
            contain: 'overscroll-y-contain',
            none: 'overscroll-y-none',
        },
    ],
    [
        'padding',
        (val) => {
            const r = { '0': 'p-0', '0px': 'p-0' }[val];
            if (r) {
                return r;
            }
            let vals = val.split(' ').filter((v) => v !== '');
            if (vals.filter((v) => !isUnit(v)).length > 0) {
                return '';
            }
            if (useAllDefaultValues) {
                vals = vals.map((v) => getRemDefaultVal(v) ?? `[${v}]`);
            } else {
                vals = vals.map((v) => `[${v}]`);
            }
            if (vals.length === 1 || new Set(vals).size === 1) {
                return `p-${vals[0]}`;
            } else if (vals.length === 2) {
                return `px-${vals[1]} py-${vals[0]}`;
            } else if (vals.length === 3) {
                if (vals[0] === vals[2]) {
                    return `px-${vals[1]} py-${vals[0]}`;
                }
                return `pt-${vals[0]} px-${vals[1]} pb-${vals[2]}`;
            } else if (vals.length === 4) {
                if (vals[0] === vals[2]) {
                    if (vals[1] === vals[3]) {
                        return `px-${vals[1]} py-${vals[0]}`;
                    }
                    return `pl-${vals[3]} pr-${vals[1]} py-${vals[0]}`;
                }
                if (vals[1] === vals[3]) {
                    if (vals[0] === vals[2]) {
                        return `px-${vals[1]} py-${vals[0]}`;
                    }
                    return `pl-${vals[3]} pr-${vals[1]} py-${vals[0]}`;
                }
                return `pt-${vals[0]} pr-${vals[1]} pb-${vals[2]} pl-${vals[3]}`;
            }
            return '';
        },
    ],
    [
        'padding-bottom',
        (val) =>
            ({ '0': 'pb-0', '0px': 'pb-0' })[val] ??
            (isUnit(val)
                ? `pb-${(useAllDefaultValues && getRemDefaultVal(val)) || `[${val}]`}`
                : ''),
    ],
    [
        'padding-left',
        (val) =>
            ({ '0': 'pl-0', '0px': 'pl-0' })[val] ??
            (isUnit(val)
                ? `pl-${(useAllDefaultValues && getRemDefaultVal(val)) || `[${val}]`}`
                : ''),
    ],
    [
        'padding-right',
        (val) =>
            ({ '0': 'pr-0', '0px': 'pr-0' })[val] ??
            (isUnit(val)
                ? `pr-${(useAllDefaultValues && getRemDefaultVal(val)) || `[${val}]`}`
                : ''),
    ],
    [
        'padding-top',
        (val) =>
            ({ '0': 'pt-0', '0px': 'pt-0' })[val] ??
            (isUnit(val)
                ? `pt-${(useAllDefaultValues && getRemDefaultVal(val)) || `[${val}]`}`
                : ''),
    ],
    [
        'page-break-after',
        {
            auto: '[page-break-after:auto]',
            always: '[page-break-after:always]',
            avoid: '[page-break-after:avoid]',
            left: '[page-break-after:left]',
            right: '[page-break-after:right]',
            inherit: '[page-break-after:inherit]',
            initial: '[page-break-after:initial]',
        },
    ],
    [
        'page-break-before',
        {
            auto: '[page-break-before:auto]',
            always: '[page-break-before:always]',
            avoid: '[page-break-before:avoid]',
            left: '[page-break-before:left]',
            right: '[page-break-before:right]',
            inherit: '[page-break-before:inherit]',
            initial: '[page-break-before:initial]',
        },
    ],
    [
        'page-break-inside',
        {
            auto: '[page-break-inside:auto]',
            avoid: '[page-break-inside:avoid]',
            inherit: '[page-break-inside:inherit]',
            initial: '[page-break-inside:initial]',
        },
    ],
    ['perspective', (val) => (isUnit(val) ? `[perspective:${val}]` : '')],
    ['perspective-origin', (val) => `[perspective-origin:${getCustomVal(val)}]`],
    [
        'place-content',
        {
            center: 'place-content-center',
            start: 'place-content-start',
            end: 'place-content-end',
            'space-between': 'place-content-between',
            'space-around': 'place-content-around',
            'space-evenly': 'place-content-evenly',
            stretch: 'place-content-stretch',
        },
    ],
    [
        'place-items',
        {
            start: 'place-items-start',
            end: 'place-items-end',
            center: 'place-items-center',
            stretch: 'place-items-stretch',
        },
    ],
    [
        'place-self',
        {
            auto: 'place-self-auto',
            start: 'place-self-start',
            end: 'place-self-end',
            center: 'place-self-center',
            stretch: 'place-self-stretch',
        },
    ],
    [
        'pointer-events',
        {
            none: 'pointer-events-none',
            auto: 'pointer-events-auto',
        },
    ],
    [
        'position',
        {
            static: 'static',
            fixed: 'fixed',
            absolute: 'absolute',
            relative: 'relative',
            sticky: 'sticky',
        },
    ],
    [
        'punctuation-trim',
        {
            none: '[punctuation-trim:none]',
            start: '[punctuation-trim:start]',
            end: '[punctuation-trim:end]',
            'allow-end': '[punctuation-trim:allow-end]',
            adjacent: '[punctuation-trim:adjacent]',
            initial: '[punctuation-trim:initial]',
        },
    ],
    ['quotes', (val) => `[quotes:${getCustomVal(val)}]`],
    [
        'resize',
        {
            none: 'resize-none',
            vertical: 'resize-y',
            horizontal: 'resize-x',
            both: 'resize',
        },
    ],
    [
        'right',
        (val) => {
            const t = hasNegative(val);
            return isUnit(val)
                ? `${t[0]}right-${getUnitMetacharactersVal(t[1], [CustomSelect.vw, CustomSelect.vh]) || `[${t[1]}]`}`
                : '';
        },
    ],
    ['rotate', (val) => `[rotate:${getCustomVal(val)}]`],
    ['row-gap', (val) => ({ '0': 'gap-y-0' })[val] ?? (isUnit(val) ? `gap-y-[${val}]` : '')],
    ['scroll-snap-align', (val) => `[scroll-snap-align:${getCustomVal(val)}]`],
    ['scroll-snap-stop', (val) => `[scroll-snap-stop:${getCustomVal(val)}]`],
    ['scroll-snap-type', (val) => `[scroll-snap-type:${getCustomVal(val)}]`],
    ['scrollbar-width', (val) => (isUnit(val) ? `[scrollbar-width:${val}]` : '')],
    ['shape-image-threshold', (val) => `[shape-image-threshold:${getCustomVal(val)}]`],
    ['shape-margin', (val) => `[shape-margin:${getCustomVal(val)}]`],
    ['shape-outside', (val) => `[shape-outside:${getCustomVal(val)}]`],
    [
        'stroke',
        (val, isCustom = false) =>
            (({
                currentColor: 'stroke-current',
                currentcolor: 'stroke-current',
            })[val] ?? isCustom)
                ? `stroke-${val}`
                : isColor(val, true)
                  ? `stroke-[${getCustomVal(val)}]`
                  : '',
    ],
    ['stroke-width', (val) => (isUnit(val) ? `stroke-[${val}]` : '')],
    ['tab-size', (val) => (isUnit(val) ? `[tab-size:${val}]` : '')],
    [
        'table-layout',
        {
            auto: 'table-auto',
            fixed: 'table-fixed',
        },
    ],
    ['target', (val) => `[target:${getCustomVal(val)}]`],
    ['target-name', (val) => `[target-name:${getCustomVal(val)}]`],
    [
        'target-new',
        {
            window: '[target-new:window]',
            tab: '[target-new:tab]',
            none: '[target-new:none]',
            initial: '[target-new:initial]',
        },
    ],
    [
        'target-position',
        {
            above: '[target-position:above]',
            behind: '[target-position:behind]',
            front: '[target-position:front]',
            back: '[target-position:back]',
            initial: '[target-position:initial]',
        },
    ],
    [
        'text-align',
        {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
            justify: 'text-justify',
            start: 'text-start',
            end: 'text-end',
        },
    ],
    [
        'text-align-last',
        {
            auto: '[text-align-last:auto]',
            left: '[text-align-last:left]',
            right: '[text-align-last:right]',
            center: '[text-align-last:center]',
            justify: '[text-align-last:justify]',
            start: '[text-align-last:start]',
            end: '[text-align-last:end]',
            initial: '[text-align-last:initial]',
            inherit: '[text-align-last:inherit]',
        },
    ],
    [
        'text-decoration',
        {
            underline: 'underline',
            'line-through': 'line-through',
            none: 'no-underline',
        },
    ],
    [
        'text-decoration-color',
        (val, isCustom = false) =>
            isCustom
                ? `[text-decoration-color:${val}]`
                : isColor(val, true)
                  ? `[text-decoration-color:${getCustomVal(val)}]`
                  : '',
    ],
    [
        'text-decoration-line',
        {
            none: '[text-decoration-line:none]',
            underline: '[text-decoration-line:underline]',
            overline: '[text-decoration-line:overline]',
            'line-through': '[text-decoration-line:line-through]',
            initial: '[text-decoration-line:initial]',
            inherit: '[text-decoration-line:inherit]',
        },
    ],
    ['text-decoration-skip-ink', (val) => `[text-decoration-skip-ink:${getCustomVal(val)}]`],
    [
        'text-decoration-style',
        {
            solid: '[text-decoration-style:solid]',
            double: '[text-decoration-style:double]',
            dotted: '[text-decoration-style:dotted]',
            dashed: '[text-decoration-style:dashed]',
            wavy: '[text-decoration-style:wavy]',
            initial: '[text-decoration-style:initial]',
            inherit: '[text-decoration-style:inherit]',
        },
    ],
    [
        'text-emphasis-color',
        (val, isCustom = false) =>
            isCustom
                ? `[text-emphasis-color:${val}]`
                : isColor(val, true)
                  ? `[text-emphasis-color:${getCustomVal(val)}]`
                  : '',
    ],
    ['text-emphasis-position', (val) => `[text-emphasis-position:${getCustomVal(val)}]`],
    ['text-emphasis-style', (val) => `[text-emphasis-style:${getCustomVal(val)}]`],
    ['text-indent', (val) => (isUnit(val) ? `[text-indent:${val}]` : '')],
    [
        'text-justify',
        {
            auto: '[text-justify:auto]',
            none: '[text-justify:none]',
            'inter-word': '[text-justify:inter-word]',
            'inter-ideograph': '[text-justify:inter-ideograph]',
            'inter-cluster': '[text-justify:inter-cluster]',
            distribute: '[text-justify:distribute]',
            kashida: '[text-justify:kashida]',
            initial: '[text-justify:initial]',
        },
    ],
    ['text-orientation', (val) => `[text-orientation:${getCustomVal(val)}]`],
    ['text-outline', (val) => `[text-outline:${getCustomVal(val)}]`],
    [
        'text-overflow',
        (val) =>
            ({
                ellipsis: 'overflow-ellipsis',
                clip: 'overflow-clip',
            })[val] ?? `[text-overflow:${getCustomVal(val)}]`,
    ],
    ['text-shadow', (val) => `[text-shadow:${getCustomVal(val)}]`],
    [
        'text-transform',
        {
            uppercase: 'uppercase',
            lowercase: 'lowercase',
            capitalize: 'capitalize',
            none: 'normal-case',
        },
    ],
    ['text-underline-offset', (val) => `[text-underline-offset:${getCustomVal(val)}]`],
    ['text-underline-position', (val) => `[text-underline-position:${getCustomVal(val)}]`],
    [
        'text-wrap',
        {
            normal: '[text-wrap:normal]',
            none: '[text-wrap:none]',
            unrestricted: '[text-wrap:unrestricted]',
            suppress: '[text-wrap:suppress]',
            initial: '[text-wrap:initial]',
        },
    ],
    [
        'top',
        (val) => {
            const t = hasNegative(val);
            return isUnit(val)
                ? `${t[0]}top-${getUnitMetacharactersVal(t[1], [CustomSelect.vw, CustomSelect.vh]) || `[${t[1]}]`}`
                : '';
        },
    ],
    [
        'transform',
        (val) => {
            const defaultVal = { none: 'transform-none' }[val];
            if (defaultVal) {
                return defaultVal;
            }

            const scaleDefaultVs: Record<string, string> = {
                '0': '0',
                '1': '100',
                '.5': '50',
                '.75': '75',
                '.9': '90',
                '.95': '95',
                '1.05': '105',
                '1.1': '110',
                '1.25': '125',
                '1.5': '150',
            };
            const rotateDefaultVs: Record<string, string> = {
                '0deg': '0',
                '1deg': '1',
                '2deg': '2',
                '3deg': '3',
                '6deg': '6',
                '12deg': '12',
                '45deg': '45',
                '90deg': '90',
                '180deg': '180',
            };
            const skewDefaultVs: Record<string, string> = {
                '0deg': '0',
                '1deg': '1',
                '2deg': '2',
                '3deg': '3',
                '6deg': '6',
                '12deg': '12',
            };
            const translateDefaultVs: Record<string, string> = {
                '0px': '0',
                '1px': 'px',
                '0.125rem': '0.5',
                '0.25rem': '1',
                '0.375rem': '1.5',
                '0.5rem': '2',
                '0.625rem': '2.5',
                '0.75rem': '3',
                '0.875rem': '3.5',
                '1rem': '4',
                '1.25rem': '5',
                '1.5rem': '6',
                '1.75rem': '7',
                '2rem': '8',
                '2.25rem': '9',
                '2.5rem': '10',
                '2.75rem': '11',
                '3rem': '12',
                '3.5rem': '14',
                '4rem': '16',
                '5rem': '20',
                '6rem': '24',
                '7rem': '28',
                '8rem': '32',
                '9rem': '36',
                '10rem': '40',
                '11rem': '44',
                '12rem': '48',
                '13rem': '52',
                '14rem': '56',
                '15rem': '60',
                '16rem': '64',
                '18rem': '72',
                '20rem': '80',
                '24rem': '96',
                '50%': '1/2',
                '33.33%': '1/3',
                '66.66%': '2/3',
                '25%': '1/4',
                '75%': '3/4',
                '100%': 'full',
            };
            const transformValConfig: Record<string, (v: string) => string | undefined> = {
                scale: (v: string) => {
                    const vs = v.split(',');
                    if (vs.length === 3) {
                        return undefined;
                    }
                    if (vs[0] === vs[1] || vs.length === 1) {
                        return `scale-${customTheme.scale?.[vs[0]] || (useAllDefaultValues && scaleDefaultVs[vs[0]]) || `[${vs[0]}]`}`;
                    }
                    return vs
                        .map((v, idx) => {
                            return `scale-${idx === 0 ? 'x' : 'y'}-${customTheme.scale?.[v] || (useAllDefaultValues && scaleDefaultVs[v]) || `[${v}]`}`;
                        })
                        .join(' ');
                },
                scaleX: (v: string) =>
                    `scale-x-${customTheme.scale?.[v] || (useAllDefaultValues && scaleDefaultVs[v]) || `[${v}]`}`,
                scaleY: (v: string) =>
                    `scale-y-${customTheme.scale?.[v] || (useAllDefaultValues && scaleDefaultVs[v]) || `[${v}]`}`,
                rotate: (v: string) => {
                    const vs = v.split(',');
                    if (vs.length > 1) {
                        if (
                            vs.length === 3 &&
                            ['0', '0deg'].findIndex((v) => v === vs[0]) > -1 &&
                            ['0', '0deg'].findIndex((v) => v === vs[1]) > -1
                        ) {
                            const t = hasNegative(vs[2]);
                            return `${t[0]}rotate-${customTheme.rotate?.[t[1]] || (useAllDefaultValues && rotateDefaultVs[t[1]]) || `[${t[1]}]`}`;
                        }
                        return undefined;
                    }
                    const t = hasNegative(vs[0]);
                    return `${t[0]}rotate-${customTheme.rotate?.[t[1]] || (useAllDefaultValues && rotateDefaultVs[t[1]]) || `[${t[1]}]`}`;
                },
                rotateZ: (v: string) => {
                    const t = hasNegative(v);
                    return `${t[0]}rotate-${customTheme.rotate?.[t[1]] || (useAllDefaultValues && rotateDefaultVs[t[1]]) || `[${t[1]}]`}`;
                },
                translate: (v: string) => {
                    const vs = v.split(',');
                    if (vs.length === 3) {
                        return undefined;
                    }
                    return vs
                        .map((v, idx) => {
                            const t = hasNegative(v);
                            if (/^\d+\.[1-9]{2,}%$/.test(t[1])) {
                                t[1] = `${Number(t[1].slice(0, -1))
                                    .toFixed(6)
                                    .replace(/(\.[1-9]{2})\d+/, '$1')}%`;
                            }
                            return `${t[0]}translate-${idx === 0 ? 'x' : 'y'}-${customTheme.translate?.[t[1]] || (useAllDefaultValues && translateDefaultVs[t[1]]) || `[${t[1]}]`}`;
                        })
                        .join(' ');
                },
                translateX: (v: string) => {
                    const t = hasNegative(v);
                    if (/^\d+\.[1-9]{2,}%$/.test(t[1])) {
                        t[1] = `${Number(t[1].slice(0, -1))
                            .toFixed(6)
                            .replace(/(\.[1-9]{2})\d+/, '$1')}%`;
                    }
                    return `${t[0]}translate-x-${customTheme.translate?.[t[1]] || (useAllDefaultValues && translateDefaultVs[t[1]]) || `[${t[1]}]`}`;
                },
                translateY: (v: string) => {
                    const t = hasNegative(v);
                    if (/^\d+\.[1-9]{2,}%$/.test(t[1])) {
                        t[1] = `${Number(t[1].slice(0, -1))
                            .toFixed(6)
                            .replace(/(\.[1-9]{2})\d+/, '$1')}%`;
                    }
                    return `${t[0]}translate-y-${customTheme.translate?.[t[1]] || (useAllDefaultValues && translateDefaultVs[t[1]]) || `[${t[1]}]`}`;
                },
                skew: (v: string) => {
                    const vs = v.split(',');
                    if (vs.length === 3) {
                        return undefined;
                    }
                    return vs
                        .map((v, idx) => {
                            const t = hasNegative(v);
                            return `${t[0]}skew-${idx === 0 ? 'x' : 'y'}-${customTheme.skew?.[t[1]] || (useAllDefaultValues && skewDefaultVs[t[1]]) || `[${t[1]}]`}`;
                        })
                        .join(' ');
                },
                skewX: (v: string) => {
                    const t = hasNegative(v);
                    return `${t[0]}skew-x-${customTheme.skew?.[t[1]] || (useAllDefaultValues && skewDefaultVs[t[1]]) || `[${t[1]}]`}`;
                },
                skewY: (v: string) => {
                    const t = hasNegative(v);
                    return `${t[0]}skew-y-${customTheme.skew?.[t[1]] || (useAllDefaultValues && skewDefaultVs[t[1]]) || `[${t[1]}]`}`;
                },
            };
            const vals = getCustomVal(val)
                .replace(/\(.+?\)/g, (v) => v.replace(/_/g, ''))
                .split(')_')
                .map((v) => `${v})`);
            vals[vals.length - 1] = vals[vals.length - 1].slice(0, -1);

            let canUse = true;
            const res = vals.map((v) => {
                let canUsePipeV = false;
                const pipeV = v.replace(/^([a-zA-Z0-9_-]+)\((.+?)\)$/, (r, k: string, v) => {
                    canUsePipeV = true;
                    const tmpRes = transformValConfig[k]?.(v) ?? (canUse = false);
                    return typeof tmpRes === 'string' ? tmpRes : '';
                });
                return canUsePipeV ? pipeV : '';
            });
            return canUse ? `${[...new Set(res)].join(' ')}` : `[transform:${getCustomVal(val)}]`;
        },
    ],
    [
        'transform-origin',
        (val) =>
            ({
                center: 'origin-center',
                top: 'origin-top',
                top_right: 'origin-top-right',
                right: 'origin-right',
                bottom_right: 'origin-bottom-right',
                bottom: 'origin-bottom',
                bottom_left: 'origin-bottom-left',
                left: 'origin-left',
                top_left: 'origin-top-left',
            })[getCustomVal(val)] ?? `origin-[${getCustomVal(val)}]`,
    ],
    [
        'transform-style',
        {
            flat: '[transform-style:flat]',
            'preserve-3d': '[transform-style:preserve-3d]',
            initial: '[transform-style:initial]',
        },
    ],
    [
        'transition',
        (val) => {
            if (val === 'none') {
                return 'transition-none';
            }
            return `[transition:${getCustomVal(val)}]`;
        },
    ],
    [
        'transition-delay',
        (val) => {
            val = val.replace(
                /^([.\d]+)s$/,
                (v, $1) => `${($1 * 1000).toFixed(6).replace(/\.?0+$/, '')}ms`,
            );
            return (
                {
                    '75ms': 'delay-75',
                    '100ms': 'delay-100',
                    '150ms': 'delay-150',
                    '200ms': 'delay-200',
                    '300ms': 'delay-300',
                    '500ms': 'delay-500',
                    '700ms': 'delay-700',
                    '1000ms': 'delay-1000',
                }[val] ?? (/^[.\d]+[ms]{1,2}$/.test(val) ? `delay-[${getCustomVal(val)}]` : '')
            );
        },
    ],
    [
        'transition-duration',
        (val) => {
            val = val.replace(
                /^([.\d]+)s$/,
                (v, $1) => `${($1 * 1000).toFixed(6).replace(/\.?0+$/, '')}ms`,
            );
            return (
                {
                    '75ms': 'duration-75',
                    '100ms': 'duration-100',
                    '150ms': 'duration-150',
                    '200ms': 'duration-200',
                    '300ms': 'duration-300',
                    '500ms': 'duration-500',
                    '700ms': 'duration-700',
                    '1000ms': 'duration-1000',
                }[val] ?? (/^[.\d]+[ms]{1,2}$/.test(val) ? `duration-[${getCustomVal(val)}]` : '')
            );
        },
    ],
    ['transition-property', (val) => `[transition-property:${getCustomVal(val)}]`],
    [
        'transition-timing-function',
        (val) => {
            val = val.replace(/\s/g, '');
            return (
                {
                    linear: 'ease-linear',
                    'cubic-bezier(0.4,0,1,1)': 'ease-in',
                    'cubic-bezier(0,0,0.2,1)': 'ease-out',
                    'cubic-bezier(0.4,0,0.2,1)': 'ease-in-out',
                    ease: 'ease-[ease]',
                    'ease-in': 'ease-in',
                    'ease-out': 'ease-out',
                    'ease-in-out': 'ease-in-out',
                }[val] ?? (val.startsWith('cubic-bezier') ? `ease-[${getCustomVal(val)}]` : '')
            );
        },
    ],
    [
        'unicode-bidi',
        {
            normal: '[unicode-bidi:normal]',
            embed: '[unicode-bidi:embed]',
            'bidi-override': '[unicode-bidi:bidi-override]',
            initial: '[unicode-bidi:initial]',
            inherit: '[unicode-bidi:inherit]',
        },
    ],
    [
        'user-select',
        {
            none: 'select-none',
            text: 'select-text',
            all: 'select-all',
            auto: 'select-auto',
        },
    ],
    [
        'vertical-align',
        {
            baseline: 'align-baseline',
            top: 'align-top',
            middle: 'align-middle',
            bottom: 'align-bottom',
            'text-top': 'align-text-top',
            'text-bottom': 'align-text-bottom',
        },
    ],
    [
        'visibility',
        {
            visible: 'visible',
            hidden: 'invisible',
        },
    ],
    [
        'white-space',
        {
            normal: 'whitespace-normal',
            nowrap: 'whitespace-nowrap',
            pre: 'whitespace-pre',
            'pre-line': 'whitespace-pre-line',
            'pre-wrap': 'whitespace-pre-wrap',
        },
    ],
    [
        'width',
        (val) =>
            isUnit(val)
                ? `w-${(useAllDefaultValues && getRemDefaultVal(val)) || getUnitMetacharactersVal(val, [CustomSelect.vh]) || `[${val}]`}`
                : '',
    ],
    [
        'word-break',
        {
            'break-all': 'break-all',
            normal: '[word-break:normal]',
            'keep-all': '[word-break:keep-all]',
            initial: '[word-break:initial]',
        },
    ],
    ['word-spacing', (val) => (isUnit(val) ? `[word-spacing:${val}]` : '')],
    [
        'word-wrap',
        {
            normal: '[word-wrap:normal]',
            'break-word': '[word-wrap:break-word]',
            initial: '[word-wrap:initial]',
        },
    ],
    ['writing-mode', (val) => `[writing-mode:${getCustomVal(val)}]`],
    [
        'z-index',
        (val) =>
            ({
                '0': 'z-0',
                '10': 'z-10',
                '20': 'z-20',
                '30': 'z-30',
                '40': 'z-40',
                '50': 'z-50',
                auto: 'z-auto',
            })[val] ?? (typeof val === 'number' ? `z-[${val}]` : ''),
    ],
]);

interface CssCodeParse {
    selectorName: string;
    cssCode: string | CssCodeParse[];
}

const parsingCode = (code: string): CssCodeParse[] => {
    code = code.replace(/[\n\r]/g, '').trim();
    const tmpCodes: CssCodeParse[] = [];
    let index = 0;
    let isSelectorName = true;
    let bracketsCount = 0;
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (['{', '}'].includes(char)) {
            if (char === '{') {
                if (bracketsCount++ === 0) {
                    isSelectorName = false;
                } else {
                    tmpCodes[index][isSelectorName ? 'selectorName' : 'cssCode'] += char;
                }
            } else {
                if (--bracketsCount === 0) {
                    const cssCode = tmpCodes[index].cssCode;
                    if (typeof cssCode === 'string' && cssCode.includes('{')) {
                        tmpCodes[index].cssCode = parsingCode(cssCode);
                    }
                    index++;
                    isSelectorName = true;
                } else {
                    tmpCodes[index][isSelectorName ? 'selectorName' : 'cssCode'] += char;
                }
            }
        } else {
            if (!tmpCodes[index]) {
                tmpCodes[index] = {
                    selectorName: '',
                    cssCode: '',
                };
            }
            tmpCodes[index][isSelectorName ? 'selectorName' : 'cssCode'] += char;
        }
    }
    return tmpCodes.map((v) => ({
        selectorName: v.selectorName.trim(),
        cssCode: typeof v.cssCode === 'string' ? v.cssCode.trim() : v.cssCode,
    }));
};

const moreDefaultMediaVals: Record<string, string> = {
    '@media(min-width:640px)': 'sm',
    '@media(min-width:768px)': 'md',
    '@media(min-width:1024px)': 'lg',
    '@media(min-width:1280px)': 'xl',
    '@media(min-width:1536px)': '2xl',
    '@media_not_all_and(min-width:640px)': 'max-sm',
    '@media_not_all_and(min-width:768px)': 'max-md',
    '@media_not_all_and(min-width:1024px)': 'max-lg',
    '@media_not_all_and(min-width:1280px)': 'max-xl',
    '@media_not_all_and(min-width:1536px)': 'max-2xl',
};

const moreDefaultValuesMap: Record<string, Record<string, string>> = {
    top: {
        '0px': 'top-0',
        '1px': 'top-px',
        '0.125rem': 'top-0.5',
        '0.25rem': 'top-1',
        '0.375rem': 'top-1.5',
        '0.5rem': 'top-2',
        '0.625rem': 'top-2.5',
        '0.75rem': 'top-3',
        '0.875rem': 'top-3.5',
        '1rem': 'top-4',
        '1.25rem': 'top-5',
        '1.5rem': 'top-6',
        '1.75rem': 'top-7',
        '2rem': 'top-8',
        '2.25rem': 'top-9',
        '2.5rem': 'top-10',
        '2.75rem': 'top-11',
        '3rem': 'top-12',
        '3.5rem': 'top-14',
        '4rem': 'top-16',
        '5rem': 'top-20',
        '6rem': 'top-24',
        '7rem': 'top-28',
        '8rem': 'top-32',
        '9rem': 'top-36',
        '10rem': 'top-40',
        '11rem': 'top-44',
        '12rem': 'top-48',
        '13rem': 'top-52',
        '14rem': 'top-56',
        '15rem': 'top-60',
        '16rem': 'top-64',
        '18rem': 'top-72',
        '20rem': 'top-80',
        '24rem': 'top-96',
        auto: 'top-auto',
        '50%': 'top-2/4',
        '33.333333%': 'top-1/3',
        '66.666667%': 'top-2/3',
        '25%': 'top-1/4',
        '75%': 'top-3/4',
        '100%': 'top-full',
        '-1px': '-top-px',
        '-0.125rem': '-top-0.5',
        '-0.25rem': '-top-1',
        '-0.375rem': '-top-1.5',
        '-0.5rem': '-top-2',
        '-0.625rem': '-top-2.5',
        '-0.75rem': '-top-3',
        '-0.875rem': '-top-3.5',
        '-1rem': '-top-4',
        '-1.25rem': '-top-5',
        '-1.5rem': '-top-6',
        '-1.75rem': '-top-7',
        '-2rem': '-top-8',
        '-2.25rem': '-top-9',
        '-2.5rem': '-top-10',
        '-2.75rem': '-top-11',
        '-3rem': '-top-12',
        '-3.5rem': '-top-14',
        '-4rem': '-top-16',
        '-5rem': '-top-20',
        '-6rem': '-top-24',
        '-7rem': '-top-28',
        '-8rem': '-top-32',
        '-9rem': '-top-36',
        '-10rem': '-top-40',
        '-11rem': '-top-44',
        '-12rem': '-top-48',
        '-13rem': '-top-52',
        '-14rem': '-top-56',
        '-15rem': '-top-60',
        '-16rem': '-top-64',
        '-18rem': '-top-72',
        '-20rem': '-top-80',
        '-24rem': '-top-96',
        '-50%': '-top-2/4',
        '-33.333333%': '-top-1/3',
        '-66.666667%': '-top-2/3',
        '-25%': '-top-1/4',
        '-75%': '-top-3/4',
        '-100%': '-top-full',
    },
    bottom: {
        '0px': 'bottom-0',
        '1px': 'bottom-px',
        '0.125rem': 'bottom-0.5',
        '0.25rem': 'bottom-1',
        '0.375rem': 'bottom-1.5',
        '0.5rem': 'bottom-2',
        '0.625rem': 'bottom-2.5',
        '0.75rem': 'bottom-3',
        '0.875rem': 'bottom-3.5',
        '1rem': 'bottom-4',
        '1.25rem': 'bottom-5',
        '1.5rem': 'bottom-6',
        '1.75rem': 'bottom-7',
        '2rem': 'bottom-8',
        '2.25rem': 'bottom-9',
        '2.5rem': 'bottom-10',
        '2.75rem': 'bottom-11',
        '3rem': 'bottom-12',
        '3.5rem': 'bottom-14',
        '4rem': 'bottom-16',
        '5rem': 'bottom-20',
        '6rem': 'bottom-24',
        '7rem': 'bottom-28',
        '8rem': 'bottom-32',
        '9rem': 'bottom-36',
        '10rem': 'bottom-40',
        '11rem': 'bottom-44',
        '12rem': 'bottom-48',
        '13rem': 'bottom-52',
        '14rem': 'bottom-56',
        '15rem': 'bottom-60',
        '16rem': 'bottom-64',
        '18rem': 'bottom-72',
        '20rem': 'bottom-80',
        '24rem': 'bottom-96',
        auto: 'bottom-auto',
        '50%': 'bottom-2/4',
        '33.333333%': 'bottom-1/3',
        '66.666667%': 'bottom-2/3',
        '25%': 'bottom-1/4',
        '75%': 'bottom-3/4',
        '100%': 'bottom-full',
        '-1px': '-bottom-px',
        '-0.125rem': '-bottom-0.5',
        '-0.25rem': '-bottom-1',
        '-0.375rem': '-bottom-1.5',
        '-0.5rem': '-bottom-2',
        '-0.625rem': '-bottom-2.5',
        '-0.75rem': '-bottom-3',
        '-0.875rem': '-bottom-3.5',
        '-1rem': '-bottom-4',
        '-1.25rem': '-bottom-5',
        '-1.5rem': '-bottom-6',
        '-1.75rem': '-bottom-7',
        '-2rem': '-bottom-8',
        '-2.25rem': '-bottom-9',
        '-2.5rem': '-bottom-10',
        '-2.75rem': '-bottom-11',
        '-3rem': '-bottom-12',
        '-3.5rem': '-bottom-14',
        '-4rem': '-bottom-16',
        '-5rem': '-bottom-20',
        '-6rem': '-bottom-24',
        '-7rem': '-bottom-28',
        '-8rem': '-bottom-32',
        '-9rem': '-bottom-36',
        '-10rem': '-bottom-40',
        '-11rem': '-bottom-44',
        '-12rem': '-bottom-48',
        '-13rem': '-bottom-52',
        '-14rem': '-bottom-56',
        '-15rem': '-bottom-60',
        '-16rem': '-bottom-64',
        '-18rem': '-bottom-72',
        '-20rem': '-bottom-80',
        '-24rem': '-bottom-96',
        '-50%': '-bottom-2/4',
        '-33.333333%': '-bottom-1/3',
        '-66.666667%': '-bottom-2/3',
        '-25%': '-bottom-1/4',
        '-75%': '-bottom-3/4',
        '-100%': '-bottom-full',
    },
    left: {
        '0px': 'left-0',
        '1px': 'left-px',
        '0.125rem': 'left-0.5',
        '0.25rem': 'left-1',
        '0.375rem': 'left-1.5',
        '0.5rem': 'left-2',
        '0.625rem': 'left-2.5',
        '0.75rem': 'left-3',
        '0.875rem': 'left-3.5',
        '1rem': 'left-4',
        '1.25rem': 'left-5',
        '1.5rem': 'left-6',
        '1.75rem': 'left-7',
        '2rem': 'left-8',
        '2.25rem': 'left-9',
        '2.5rem': 'left-10',
        '2.75rem': 'left-11',
        '3rem': 'left-12',
        '3.5rem': 'left-14',
        '4rem': 'left-16',
        '5rem': 'left-20',
        '6rem': 'left-24',
        '7rem': 'left-28',
        '8rem': 'left-32',
        '9rem': 'left-36',
        '10rem': 'left-40',
        '11rem': 'left-44',
        '12rem': 'left-48',
        '13rem': 'left-52',
        '14rem': 'left-56',
        '15rem': 'left-60',
        '16rem': 'left-64',
        '18rem': 'left-72',
        '20rem': 'left-80',
        '24rem': 'left-96',
        auto: 'left-auto',
        '50%': 'left-2/4',
        '33.333333%': 'left-1/3',
        '66.666667%': 'left-2/3',
        '25%': 'left-1/4',
        '75%': 'left-3/4',
        '100%': 'left-full',
        '-1px': '-left-px',
        '-0.125rem': '-left-0.5',
        '-0.25rem': '-left-1',
        '-0.375rem': '-left-1.5',
        '-0.5rem': '-left-2',
        '-0.625rem': '-left-2.5',
        '-0.75rem': '-left-3',
        '-0.875rem': '-left-3.5',
        '-1rem': '-left-4',
        '-1.25rem': '-left-5',
        '-1.5rem': '-left-6',
        '-1.75rem': '-left-7',
        '-2rem': '-left-8',
        '-2.25rem': '-left-9',
        '-2.5rem': '-left-10',
        '-2.75rem': '-left-11',
        '-3rem': '-left-12',
        '-3.5rem': '-left-14',
        '-4rem': '-left-16',
        '-5rem': '-left-20',
        '-6rem': '-left-24',
        '-7rem': '-left-28',
        '-8rem': '-left-32',
        '-9rem': '-left-36',
        '-10rem': '-left-40',
        '-11rem': '-left-44',
        '-12rem': '-left-48',
        '-13rem': '-left-52',
        '-14rem': '-left-56',
        '-15rem': '-left-60',
        '-16rem': '-left-64',
        '-18rem': '-left-72',
        '-20rem': '-left-80',
        '-24rem': '-left-96',
        '-50%': '-left-2/4',
        '-33.333333%': '-left-1/3',
        '-66.666667%': '-left-2/3',
        '-25%': '-left-1/4',
        '-75%': '-left-3/4',
        '-100%': '-left-full',
    },
    right: {
        '0px': 'right-0',
        '1px': 'right-px',
        '0.125rem': 'right-0.5',
        '0.25rem': 'right-1',
        '0.375rem': 'right-1.5',
        '0.5rem': 'right-2',
        '0.625rem': 'right-2.5',
        '0.75rem': 'right-3',
        '0.875rem': 'right-3.5',
        '1rem': 'right-4',
        '1.25rem': 'right-5',
        '1.5rem': 'right-6',
        '1.75rem': 'right-7',
        '2rem': 'right-8',
        '2.25rem': 'right-9',
        '2.5rem': 'right-10',
        '2.75rem': 'right-11',
        '3rem': 'right-12',
        '3.5rem': 'right-14',
        '4rem': 'right-16',
        '5rem': 'right-20',
        '6rem': 'right-24',
        '7rem': 'right-28',
        '8rem': 'right-32',
        '9rem': 'right-36',
        '10rem': 'right-40',
        '11rem': 'right-44',
        '12rem': 'right-48',
        '13rem': 'right-52',
        '14rem': 'right-56',
        '15rem': 'right-60',
        '16rem': 'right-64',
        '18rem': 'right-72',
        '20rem': 'right-80',
        '24rem': 'right-96',
        auto: 'right-auto',
        '50%': 'right-2/4',
        '33.333333%': 'right-1/3',
        '66.666667%': 'right-2/3',
        '25%': 'right-1/4',
        '75%': 'right-3/4',
        '100%': 'right-full',
        '-1px': '-right-px',
        '-0.125rem': '-right-0.5',
        '-0.25rem': '-right-1',
        '-0.375rem': '-right-1.5',
        '-0.5rem': '-right-2',
        '-0.625rem': '-right-2.5',
        '-0.75rem': '-right-3',
        '-0.875rem': '-right-3.5',
        '-1rem': '-right-4',
        '-1.25rem': '-right-5',
        '-1.5rem': '-right-6',
        '-1.75rem': '-right-7',
        '-2rem': '-right-8',
        '-2.25rem': '-right-9',
        '-2.5rem': '-right-10',
        '-2.75rem': '-right-11',
        '-3rem': '-right-12',
        '-3.5rem': '-right-14',
        '-4rem': '-right-16',
        '-5rem': '-right-20',
        '-6rem': '-right-24',
        '-7rem': '-right-28',
        '-8rem': '-right-32',
        '-9rem': '-right-36',
        '-10rem': '-right-40',
        '-11rem': '-right-44',
        '-12rem': '-right-48',
        '-13rem': '-right-52',
        '-14rem': '-right-56',
        '-15rem': '-right-60',
        '-16rem': '-right-64',
        '-18rem': '-right-72',
        '-20rem': '-right-80',
        '-24rem': '-right-96',
        '-50%': '-right-2/4',
        '-33.333333%': '-right-1/3',
        '-66.666667%': '-right-2/3',
        '-25%': '-right-1/4',
        '-75%': '-right-3/4',
        '-100%': '-right-full',
    },
    gap: {
        '0px': 'gap-0',
        '0.125rem': 'gap-0.5',
        '0.25rem': 'gap-1',
        '0.375rem': 'gap-1.5',
        '0.5rem': 'gap-2',
        '0.625rem': 'gap-2.5',
        '0.75rem': 'gap-3',
        '0.875rem': 'gap-3.5',
        '1rem': 'gap-4',
        '1.25rem': 'gap-5',
        '1.5rem': 'gap-6',
        '1.75rem': 'gap-7',
        '2rem': 'gap-8',
        '2.25rem': 'gap-9',
        '2.5rem': 'gap-10',
        '2.75rem': 'gap-11',
        '3rem': 'gap-12',
        '3.5rem': 'gap-14',
        '4rem': 'gap-16',
        '5rem': 'gap-20',
        '6rem': 'gap-24',
        '7rem': 'gap-28',
        '8rem': 'gap-32',
        '9rem': 'gap-36',
        '10rem': 'gap-40',
        '11rem': 'gap-44',
        '12rem': 'gap-48',
        '13rem': 'gap-52',
        '14rem': 'gap-56',
        '15rem': 'gap-60',
        '16rem': 'gap-64',
        '18rem': 'gap-72',
        '20rem': 'gap-80',
        '24rem': 'gap-96',
    },
    'column-gap': {
        '0px': 'gap-x-0',
        '1px': 'gap-x-px',
        '0.125rem': 'gap-x-0.5',
        '0.25rem': 'gap-x-1',
        '0.375rem': 'gap-x-1.5',
        '0.5rem': 'gap-x-2',
        '0.625rem': 'gap-x-2.5',
        '0.75rem': 'gap-x-3',
        '0.875rem': 'gap-x-3.5',
        '1rem': 'gap-x-4',
        '1.25rem': 'gap-x-5',
        '1.5rem': 'gap-x-6',
        '1.75rem': 'gap-x-7',
        '2rem': 'gap-x-8',
        '2.25rem': 'gap-x-9',
        '2.5rem': 'gap-x-10',
        '2.75rem': 'gap-x-11',
        '3rem': 'gap-x-12',
        '3.5rem': 'gap-x-14',
        '4rem': 'gap-x-16',
        '5rem': 'gap-x-20',
        '6rem': 'gap-x-24',
        '7rem': 'gap-x-28',
        '8rem': 'gap-x-32',
        '9rem': 'gap-x-36',
        '10rem': 'gap-x-40',
        '11rem': 'gap-x-44',
        '12rem': 'gap-x-48',
        '13rem': 'gap-x-52',
        '14rem': 'gap-x-56',
        '15rem': 'gap-x-60',
        '16rem': 'gap-x-64',
        '18rem': 'gap-x-72',
        '20rem': 'gap-x-80',
        '24rem': 'gap-x-96',
    },
    'row-gap': {
        '0px': 'gap-y-0',
        '1px': 'gap-y-px',
        '0.125rem': 'gap-y-0.5',
        '0.25rem': 'gap-y-1',
        '0.375rem': 'gap-y-1.5',
        '0.5rem': 'gap-y-2',
        '0.625rem': 'gap-y-2.5',
        '0.75rem': 'gap-y-3',
        '0.875rem': 'gap-y-3.5',
        '1rem': 'gap-y-4',
        '1.25rem': 'gap-y-5',
        '1.5rem': 'gap-y-6',
        '1.75rem': 'gap-y-7',
        '2rem': 'gap-y-8',
        '2.25rem': 'gap-y-9',
        '2.5rem': 'gap-y-10',
        '2.75rem': 'gap-y-11',
        '3rem': 'gap-y-12',
        '3.5rem': 'gap-y-14',
        '4rem': 'gap-y-16',
        '5rem': 'gap-y-20',
        '6rem': 'gap-y-24',
        '7rem': 'gap-y-28',
        '8rem': 'gap-y-32',
        '9rem': 'gap-y-36',
        '10rem': 'gap-y-40',
        '11rem': 'gap-y-44',
        '12rem': 'gap-y-48',
        '13rem': 'gap-y-52',
        '14rem': 'gap-y-56',
        '15rem': 'gap-y-60',
        '16rem': 'gap-y-64',
        '18rem': 'gap-y-72',
        '20rem': 'gap-y-80',
        '24rem': 'gap-y-96',
    },
    'max-width': {
        '0rem': 'max-w-0',
        '20rem': 'max-w-xs',
        '24rem': 'max-w-sm',
        '28rem': 'max-w-md',
        '32rem': 'max-w-lg',
        '36rem': 'max-w-xl',
        '42rem': 'max-w-2xl',
        '48rem': 'max-w-3xl',
        '56rem': 'max-w-4xl',
        '64rem': 'max-w-5xl',
        '72rem': 'max-w-6xl',
        '80rem': 'max-w-7xl',
        '65ch': 'max-w-prose',
        '640px': 'max-w-screen-sm',
        '768px': 'max-w-screen-md',
        '1024px': 'max-w-screen-lg',
        '1280px': 'max-w-screen-xl',
        '1536px': 'max-w-screen-2xl',
    },
    'max-height': {
        '1px': 'max-h-px',
        '0.125rem': 'max-h-0.5',
        '0.25rem': 'max-h-1',
        '0.375rem': 'max-h-1.5',
        '0.5rem': 'max-h-2',
        '0.625rem': 'max-h-2.5',
        '0.75rem': 'max-h-3',
        '0.875rem': 'max-h-3.5',
        '1rem': 'max-h-4',
        '1.25rem': 'max-h-5',
        '1.5rem': 'max-h-6',
        '1.75rem': 'max-h-7',
        '2rem': 'max-h-8',
        '2.25rem': 'max-h-9',
        '2.5rem': 'max-h-10',
        '2.75rem': 'max-h-11',
        '3rem': 'max-h-12',
        '3.5rem': 'max-h-14',
        '4rem': 'max-h-16',
        '5rem': 'max-h-20',
        '6rem': 'max-h-24',
        '7rem': 'max-h-28',
        '8rem': 'max-h-32',
        '9rem': 'max-h-36',
        '10rem': 'max-h-40',
        '11rem': 'max-h-44',
        '12rem': 'max-h-48',
        '13rem': 'max-h-52',
        '14rem': 'max-h-56',
        '15rem': 'max-h-60',
        '16rem': 'max-h-64',
        '18rem': 'max-h-72',
        '20rem': 'max-h-80',
        '24rem': 'max-h-96',
    },
    'font-family': {
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"':
            'font-sans',
        'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif': 'font-serif',
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace':
            'font-mono',
    },
    'font-weight': {
        '100': 'font-thin',
        '200': 'font-extralight',
        '300': 'font-light',
        '400': 'font-normal',
        '500': 'font-medium',
        '600': 'font-semibold',
        '700': 'font-bold',
        '800': 'font-extrabold',
        '900': 'font-black',
        normal: 'font-normal',
        bold: 'font-bold',
    },
    'line-height': {
        '1': 'leading-none',
        '2': 'leading-loose',
        '.75rem': 'leading-3',
        '1rem': 'leading-4',
        '1.25rem': 'leading-5',
        '1.5rem': 'leading-6',
        '1.75rem': 'leading-7',
        '2rem': 'leading-8',
        '2.25rem': 'leading-9',
        '2.5rem': 'leading-10',
        '1.25': 'leading-tight',
        '1.375': 'leading-snug',
        '1.5': 'leading-normal',
        '1.625': 'leading-relaxed',
    },
    'border-width': {
        '0px': 'border-0',
        '2px': 'border-2',
        '4px': 'border-4',
        '8px': 'border-8',
        '1px': 'border',
    },
    'border-top-width': {
        '0px': 'border-t-0',
        '2px': 'border-t-2',
        '4px': 'border-t-4',
        '8px': 'border-t-8',
        '1px': 'border-t',
    },
    'border-right-width': {
        '0px': 'border-r-0',
        '2px': 'border-r-2',
        '4px': 'border-r-4',
        '8px': 'border-r-8',
        '1px': 'border-r',
    },
    'border-bottom-width': {
        '0px': 'border-b-0',
        '2px': 'border-b-2',
        '4px': 'border-b-4',
        '8px': 'border-b-8',
        '1px': 'border-b',
    },
    'border-left-width': {
        '0px': 'border-l-0',
        '2px': 'border-l-2',
        '4px': 'border-l-4',
        '8px': 'border-l-8',
        '1px': 'border-l',
    },
    transition: {
        'all 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-all',
        'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter 150ms cubic-bezier(0.4, 0, 0.2, 1)':
            'transition',
        'background-color, border-color, color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1)':
            'transition-colors',
        'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-opacity',
        'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-shadow',
        'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-transform',
    },
};

const getResultCode = (it: CssCodeParse, prefix = '', config: TranslatorConfig) => {
    if (typeof it.cssCode !== 'string') {
        return null;
    }
    const cssCodeList = it.cssCode.split(';').filter((v) => v !== '');
    const resultVals = cssCodeList
        .map((v) => {
            let key = '';
            let val = '';
            for (let i = 0; i < v.length; i++) {
                const c = v[i];
                if (c !== ':') {
                    key += c;
                } else {
                    val = v.slice(i + 1, v.length).trim();
                    break;
                }
            }
            const pipe = propertyMap.get(key.trim());
            let hasImportant = false;
            if (val.includes('!important')) {
                val = val.replace('!important', '').trim();
                hasImportant = true;
            }
            let pipeVal = '';
            if (val === 'initial' || val === 'inherit') {
                pipeVal = `[${key.trim()}:${val}]`;
            } else {
                config.customTheme = config.customTheme ?? {};
                // Handle all font-family values without square brackets
                if (key.trim() === 'font-family') {
                    pipeVal = `font-${val}`;
                } else {
                    pipeVal =
                        typeof pipe === 'function'
                            ? config.customTheme[key.trim()]?.[val] ||
                              (config.useAllDefaultValues &&
                                  moreDefaultValuesMap[key.trim()]?.[val]) ||
                              pipe(val)
                            : config.customTheme[key.trim()]?.[val] ||
                              (config.useAllDefaultValues &&
                                  moreDefaultValuesMap[key.trim()]?.[val]) ||
                              (pipe?.[val] ?? '');
                }
            }
            if ((config.prefix?.length ?? 0) > 0) {
                pipeVal = pipeVal
                    .split(' ')
                    .map((v) => `${v[0] === '-' ? '-' : ''}${config.prefix}${v.replace(/^-/, '')}`)
                    .join(' ');
            }
            if (hasImportant) {
                const getImportantVal = (v: string) => {
                    if (v[0] === '[' && v[v.length - 1] === ']') {
                        v = `${v.slice(0, -1)}!important]`;
                    } else {
                        v = `!${v}`;
                    }
                    return v;
                };
                if (
                    pipeVal.includes(' ') &&
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length === 0
                ) {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => getImportantVal(v))
                        .join(' ');
                } else if (pipeVal.length > 0) {
                    pipeVal = getImportantVal(pipeVal);
                }
            }
            if (it.selectorName.endsWith(':hover') && pipeVal.length > 0) {
                if (
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length > 0
                ) {
                    pipeVal = `hover:${pipeVal}`;
                } else {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => `hover:${v}`)
                        .join(' ');
                }
            } else if (it.selectorName.endsWith(':focus') && pipeVal.length > 0) {
                if (
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length > 0
                ) {
                    pipeVal = `focus:${pipeVal}`;
                } else {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => `focus:${v}`)
                        .join(' ');
                }
            } else if (it.selectorName.endsWith(':active') && pipeVal.length > 0) {
                if (
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length > 0
                ) {
                    pipeVal = `active:${pipeVal}`;
                } else {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => `active:${v}`)
                        .join(' ');
                }
            } else if (it.selectorName.endsWith('::before') && pipeVal.length > 0) {
                if (
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length > 0
                ) {
                    pipeVal = `before:${pipeVal}`;
                } else {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => `before:${v}`)
                        .join(' ');
                }
            } else if (it.selectorName.endsWith('::after') && pipeVal.length > 0) {
                if (
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length > 0
                ) {
                    pipeVal = `after:${pipeVal}`;
                } else {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => `after:${v}`)
                        .join(' ');
                }
            }
            if (prefix.length > 0) {
                if (
                    ['backdrop-filter', 'filter', 'transform'].filter((v) => pipeVal.startsWith(v))
                        .length > 0
                ) {
                    pipeVal = `${prefix}:${pipeVal}`;
                } else {
                    pipeVal = pipeVal
                        .split(' ')
                        .map((v) => `${prefix}:${v}`)
                        .join(' ');
                }
            }
            return pipeVal;
        })
        .filter((v) => v !== '');
    return {
        selectorName: it.selectorName,
        resultVal: [...new Set(resultVals)].join(' '),
    };
};

export interface CustomTheme extends Record<string, undefined | Record<string, string>> {
    media?: Record<string, string>;
    'backdrop-blur'?: Record<string, string>;
    'backdrop-brightness'?: Record<string, string>;
    'backdrop-contrast'?: Record<string, string>;
    'backdrop-grayscale'?: Record<string, string>;
    'backdrop-hue-rotate'?: Record<string, string>;
    'backdrop-invert'?: Record<string, string>;
    'backdrop-opacity'?: Record<string, string>;
    'backdrop-saturate'?: Record<string, string>;
    'backdrop-sepia'?: Record<string, string>;
    blur?: Record<string, string>;
    brightness?: Record<string, string>;
    contrast?: Record<string, string>;
    grayscale?: Record<string, string>;
    'hue-rotate'?: Record<string, string>;
    invert?: Record<string, string>;
    saturate?: Record<string, string>;
    sepia?: Record<string, string>;
    scale?: Record<string, string>;
    rotate?: Record<string, string>;
    translate?: Record<string, string>;
    skew?: Record<string, string>;
}

export interface TranslatorConfig {
    prefix?: string;
    /**
     * @default true
     */
    useAllDefaultValues?: boolean;
    customTheme?: CustomTheme;
}

export const defaultTranslatorConfig = {
    prefix: '',
    useAllDefaultValues: true,
    customTheme: {},
};

export const CssToTailwindTranslator = (
    code: string,
    config: TranslatorConfig = defaultTranslatorConfig,
): {
    code: 'SyntaxError' | 'OK';
    data: ResultCode[];
} => {
    if (specialAttribute.map((v) => code.includes(v)).filter((v) => v).length > 0) {
        return {
            code: 'SyntaxError',
            data: [],
        };
    }
    useAllDefaultValues = config.useAllDefaultValues ?? defaultTranslatorConfig.useAllDefaultValues;
    customTheme = config.customTheme ?? defaultTranslatorConfig.customTheme;
    const dataArray: ResultCode[] = [];
    parsingCode(code)
        .map((it) => {
            if (typeof it.cssCode === 'string') {
                return getResultCode(it, '', config);
            } else if (it.selectorName.includes('@media')) {
                return it.cssCode.map((v) => {
                    const mediaName = getCustomVal(
                        it.selectorName
                            .replace(/\(.+\)/g, (v) => v.replace(/\s/g, ''))
                            .replace(/\s+\(/g, '('),
                    );
                    const res = getResultCode(
                        v,
                        customTheme.media?.[it.selectorName] ||
                            (config.useAllDefaultValues && moreDefaultMediaVals[mediaName]) ||
                            `[${mediaName}]`,
                        config,
                    );
                    return res
                        ? {
                              selectorName: `${it.selectorName}-->${res.selectorName}`,
                              resultVal: res.resultVal,
                          }
                        : null;
                });
            } else {
                return null;
            }
        })
        .filter((v) => v !== null)
        .forEach((v) => {
            if (Array.isArray(v)) {
                dataArray.push(...(v as ResultCode[]));
            } else {
                dataArray.push(v as ResultCode);
            }
        });
    return {
        code: 'OK',
        data: dataArray,
    };
};
