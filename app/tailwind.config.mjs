import { colors, fontSize } from './common/tokens';

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
                DEFAULT: colors.red[900],
                foreground: colors.red[100],
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
                active: colors.gray[700],
                brand: {
                    DEFAULT: colors.teal[700],
                    secondary: colors.teal[500],
                },
                DEFAULT: colors.gray[900],
                disabled: colors.gray[900],
                hover: colors.gray[800],
                'new-active': colors.blue[400],
                'new-default': colors.blue[100],
                positive: colors.green[800],
                primary: colors.gray[900],
                secondary: colors.gray[800],
                tertiary: colors.gray[700],
                'toolbar-base': colors.black[85],
            },
            text: {
                active: colors.gray[50],
                hover: colors.gray[100],
                brand: colors.red,
                DEFAULT: colors.gray[200],
                disabled: colors.gray[800],
                'new-active': colors.blue[950],
                'new-default': colors.blue[700],
                positive: colors.green[200],
                primary: colors.gray[50],
                quadranary: colors.gray[500],
                secondary: colors.gray[200],
                tertiary: colors.gray[300],
            },
            icon: {
                active: colors.gray[50],
                DEFAULT: colors.gray[300],
                disabled: colors.gray[200],
                hover: colors.gray[50],
            },
            border: {
                active: colors.gray[400],
                DEFAULT: colors.gray[800],
                hover: colors.gray[500],
                'new-active': colors.blue[600],
                'new-default': colors.blue[200],
                'new-hover': colors.blue[500],
            },
            ...colors,
        },
        fontSize: {
            ...fontSize,
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
            'layer-panel-in': {
                from: {
                    transform: 'translateX(-100%)',
                },
                to: {
                    transform: 'translateX(0)',
                },
            },
            'edit-panel-in': {
                from: {
                    transform: 'translateX(15rem)',
                },
                to: {
                    transform: 'translateX(0)',
                },
            },
            'toolbar-up': {
                '0%': {
                    transform: 'translateY(150%) translateX(-50%)',
                },
                '50%': {
                    transform: 'translateY(150%) translateX(-50%)',
                },
                '100%': {
                    transform: 'translateY(0) translateX(-50%)',
                },
            },
            wiggle: {
                '0%': { transform: 'rotate(0.5deg)' },
                '33%': { transform: 'rotate(-0.5deg)' },
                '66%': { transform: 'rotate(0.5deg)' },
                '100%': { transform: 'rotate(-0.5deg)' },
            },
        },
        animation: {
            'accordion-down': 'accordion-down 0.2s ease-out',
            'accordion-up': 'accordion-up 0.2s ease-out',
            'edit-panel-in': 'edit-panel-in 1s ease',
            'layer-panel-in': 'layer-panel-in 1s ease',
            'toolbar-up': 'toolbar-up 1.25s ease',
            wiggle: 'wiggle 0.5s cubic-bezier(0.25, 1, 0.5, 1) 7s infinite',
        },
    },
};
export const plugins = [require('tailwindcss-animate')];
