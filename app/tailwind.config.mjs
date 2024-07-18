import { colors } from './tailwind.primitives';

/** @type {import('tailwindcss').Config} */
export const darkMode = ['class'];
export const content = [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
];
export const prefix = '';
export const theme = {
    container: {
        center: true,
        padding: '2rem',
        screens: {
            '2xl': '1400px',
        },
    },
    extend: {
        colors: {
            input: 'hsl(var(--input))',
            ring: 'hsl(var(--ring))',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            primary: {
                DEFAULT: 'hsl(var(--primary))',
                foreground: 'hsl(var(--primary-foreground))',
            },
            secondary: {
                DEFAULT: 'hsl(var(--secondary))',
                foreground: 'hsl(var(--secondary-foreground))',
            },
            destructive: {
                DEFAULT: 'hsl(var(--destructive))',
                foreground: 'hsl(var(--destructive-foreground))',
            },
            muted: {
                DEFAULT: 'hsl(var(--muted))',
                foreground: 'hsl(var(--muted-foreground))',
            },
            accent: {
                DEFAULT: 'hsl(var(--accent))',
                foreground: 'hsl(var(--accent-foreground))',
            },
            popover: {
                DEFAULT: 'hsl(var(--popover))',
                foreground: 'hsl(var(--popover-foreground))',
            },
            card: {
                DEFAULT: 'hsl(var(--card))',
                foreground: 'hsl(var(--card-foreground))',
            },

            /*--- TOKENS –--*/
            bg: {
                active: colors.gray[300],
                brand: {
                    DEFAULT: colors.teal[700],
                    secondary: colors.teal[500],
                },
                DEFAULT: colors.gray[100],
                disabled: colors.gray[100],
                hover: colors.gray[200],
                'new-active': colors.blue[300],
                'new-default': colors.blue[100],
                positive: colors.green[300],
                primary: colors.gray[100],
                secondary: colors.gray[200],
                tertiary: colors.gray[300],
                'toolbar-base': colors.black[85],
            },
            text: {
                active: 'var(--text-primary)',
                brand: 'var(--color-red)',
                DEFAULT: 'var(--text-secondary)',
                disabled: 'var(--text-quadranary)',
                'new-active': 'var(--color-blue-1000)',
                'new-default': 'var(--color-blue-700)',
                positive: 'var(--color-green-700)',
                primary: 'var(--color-gray-1000)',
                quadranary: 'var(--color-gray-500)',
                secondary: 'var(--color-gray-900)',
                tertiary: 'var(--color-gray-800)',
            },
            icon: {
                active: 'var(--text-active)',
                DEFAULT: 'var(--text-tertiary)',
                disabled: 'var(--text-disabled)',
                hover: 'var(--text-active)',
            },
            border: {
                active: colors.gray[600],
                DEFAULT: colors.gray[200],
                hover: colors.gray[500],
                'new-active': colors.blue[600],
                'new-default': colors.blue[400],
                'new-hover': colors.blue[500],
            },
            ...colors,
        },
        keyframes: {
            'accordion-down': {
                from: { height: '0' },
                to: { height: 'var(--radix-accordion-content-height)' },
            },
            'accordion-up': {
                from: { height: 'var(--radix-accordion-content-height)' },
                to: { height: '0' },
            },
        },
        animation: {
            'accordion-down': 'accordion-down 0.2s ease-out',
            'accordion-up': 'accordion-up 0.2s ease-out',
        },
    },
};
export const plugins = [require('tailwindcss-animate')];
