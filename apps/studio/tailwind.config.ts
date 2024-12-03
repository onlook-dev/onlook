import baseConfig from '@onlook/ui/tailwind.config';
import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors.js';
import typography from '@tailwindcss/typography';

function flattenColors(colors, prefix = '') {
    return Object.keys(colors).reduce((acc, key) => {
        const value = colors[key];
        const newKey = prefix ? `${prefix}-${key}` : key;

        if (typeof value === 'string') {
            return { ...acc, [newKey]: value };
        }

        if (typeof value === 'object') {
            return { ...acc, ...flattenColors(value, newKey) };
        }

        return acc;
    }, {});
}

function exposeColorsAsCssVariables({ addBase }) {
    const flatColors = flattenColors(colors);

    addBase({
        ':root': Object.fromEntries(
            Object.entries(flatColors).map(([key, value]) => [`--color-${key}`, value]),
        ),
    });
}

export default {
    content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
    presets: [baseConfig],
    plugins: [typography, exposeColorsAsCssVariables],
} satisfies Config;
