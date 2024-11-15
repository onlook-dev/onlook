export const coreColors = [
    'slate',
    'gray',
    'zinc',
    'neutral',
    'stone',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
];

const coreStyles = {
    layout: {
        display: [
            'block',
            'inline-block',
            'inline',
            'flex',
            'inline-flex',
            'grid',
            'inline-grid',
            'hidden',
        ],
        position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
        float: ['float-right', 'float-left', 'float-none'],
        clear: ['clear-left', 'clear-right', 'clear-both', 'clear-none'],
    },
    spacing: {
        padding: generateSpacingClasses('p'),
        margin: generateSpacingClasses('m'),
    },
    sizing: {
        width: generateSizeClasses('w'),
        height: generateSizeClasses('h'),
    },
    typography: {
        fontSize: [
            'text-xs',
            'text-sm',
            'text-base',
            'text-lg',
            'text-xl',
            'text-2xl',
            'text-3xl',
            'text-4xl',
            'text-5xl',
            'text-6xl',
        ],
        fontWeight: [
            'font-thin',
            'font-extralight',
            'font-light',
            'font-normal',
            'font-medium',
            'font-semibold',
            'font-bold',
            'font-extrabold',
            'font-black',
        ],
        textAlign: ['text-left', 'text-center', 'text-right', 'text-justify'],
        textColor: generateColors('text'),
        textDecoration: ['underline', 'line-through', 'no-underline'],
    },
    backgrounds: {
        backgroundColor: generateColors('bg'),
        backgroundOpacity: generateOpacityClasses('bg-opacity'),
    },
    borders: {
        borderWidth: generateBorderClasses(),
        borderColor: generateColors('border'),
        borderRadius: [
            'rounded-none',
            'rounded-sm',
            'rounded',
            'rounded-md',
            'rounded-lg',
            'rounded-xl',
            'rounded-2xl',
            'rounded-3xl',
            'rounded-full',
        ],
    },
    flexbox: {
        flexDirection: ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'],
        flexWrap: ['flex-wrap', 'flex-wrap-reverse', 'flex-nowrap'],
        alignItems: ['items-start', 'items-center', 'items-end', 'items-baseline', 'items-stretch'],
        justifyContent: [
            'justify-start',
            'justify-center',
            'justify-end',
            'justify-between',
            'justify-around',
            'justify-evenly',
        ],
    },
    grid: {
        gridCols: generateGridClasses('grid-cols', 12),
        gridRows: generateGridClasses('grid-rows', 6),
        gap: generateSpacingClasses('gap'),
    },
    effects: {
        opacity: generateOpacityClasses('opacity'),
        shadow: [
            'shadow-sm',
            'shadow',
            'shadow-md',
            'shadow-lg',
            'shadow-xl',
            'shadow-2xl',
            'shadow-none',
        ],
    },
    transitions: {
        transitionProperty: [
            'transition-none',
            'transition-all',
            'transition',
            'transition-colors',
            'transition-opacity',
            'transition-shadow',
            'transition-transform',
        ],
        transitionDuration: generateDurationClasses(),
    },
    interactivity: {
        cursor: [
            'cursor-default',
            'cursor-pointer',
            'cursor-wait',
            'cursor-text',
            'cursor-move',
            'cursor-not-allowed',
        ],
        userSelect: ['select-none', 'select-text', 'select-all', 'select-auto'],
    },
};

function generateSpacingClasses(prefix: string): string[] {
    const sizes = [
        '0',
        '0.5',
        '1',
        '1.5',
        '2',
        '2.5',
        '3',
        '3.5',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '14',
        '16',
        '20',
    ];
    const directions = ['', 'x', 'y', 't', 'r', 'b', 'l'];
    return directions.flatMap((dir) => sizes.map((size) => `${prefix}${dir}-${size}`));
}

function generateSizeClasses(prefix: string): string[] {
    const sizes = [
        '0',
        '0.5',
        '1',
        '1.5',
        '2',
        '2.5',
        '3',
        '3.5',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '14',
        '16',
        '20',
        '24',
        '28',
        '32',
        '36',
        '40',
        '44',
        '48',
        '52',
        '56',
        '60',
        '64',
        '72',
        '80',
        '96',
        'auto',
        '1/2',
        '1/3',
        '2/3',
        '1/4',
        '2/4',
        '3/4',
        '1/5',
        '2/5',
        '3/5',
        '4/5',
        'full',
        'screen',
        'min',
        'max',
        'fit',
    ];
    return sizes.map((size) => `${prefix}-${size}`);
}

function generateColors(prefix: string): string[] {
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
    return coreColors.flatMap((color) => shades.map((shade) => `${prefix}-${color}-${shade}`));
}

function generateOpacityClasses(prefix: string): string[] {
    const opacities = [
        '0',
        '5',
        '10',
        '20',
        '25',
        '30',
        '40',
        '50',
        '60',
        '70',
        '75',
        '80',
        '90',
        '95',
        '100',
    ];
    return opacities.map((opacity) => `${prefix}-${opacity}`);
}

function generateBorderClasses(): string[] {
    const sides = ['', 't-', 'r-', 'b-', 'l-'];
    const widths = ['0', '2', '4', '8'];
    return sides.flatMap((side) => widths.map((width) => `border-${side}${width}`));
}

function generateGridClasses(prefix: string, max: number): string[] {
    return Array.from({ length: max }, (_, i) => `${prefix}-${i + 1}`);
}

function generateDurationClasses(): string[] {
    const durations = ['75', '100', '150', '200', '300', '500', '700', '1000'];
    return durations.map((duration) => `duration-${duration}`);
}

export function getAllTailwindClasses(): string[] {
    const allClasses = new Set<string>();

    function addClassesFromObject(obj: any) {
        for (const key in obj) {
            if (Array.isArray(obj[key])) {
                obj[key].forEach((cls: string) => allClasses.add(cls));
            } else if (typeof obj[key] === 'object') {
                addClassesFromObject(obj[key]);
            }
        }
    }

    addClassesFromObject(coreStyles);
    return Array.from(allClasses);
}

export function searchTailwindClasses(input: string): string[] {
    const allClasses = getAllTailwindClasses();
    if (!input.trim()) {
        return [];
    }

    const searchTerm = input.toLowerCase();
    return allClasses.filter((cls) => cls.toLowerCase().includes(searchTerm)).slice(0, 10); // Limit results for performance
}

export function getClassesByCategory(category: keyof typeof coreStyles): string[] {
    return Array.isArray(coreStyles[category])
        ? coreStyles[category]
        : Object.values(coreStyles[category]).flat();
}

export function getContextualSuggestions(currentClasses: string[]): string[] {
    // Add logic to suggest complementary classes based on what's already used
    // For example, if 'flex' is used, suggest 'items-center', 'justify-between', etc.
    const suggestions: string[] = [];

    if (currentClasses.includes('flex')) {
        suggestions.push(...coreStyles.flexbox.alignItems);
        suggestions.push(...coreStyles.flexbox.justifyContent);
    }

    if (currentClasses.includes('grid')) {
        suggestions.push(...coreStyles.grid.gridCols);
        suggestions.push(...coreStyles.grid.gap);
    }

    return suggestions.slice(0, 10);
}
