import type { Config } from 'tailwindcss';
import { colors, fontSize } from './tokens';

const config = {
    darkMode: ['class', '[data-mode="dark"]'],
    content: ['./src/**/*.{ts,tsx}'],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                ...colors,
                background: {
                    DEFAULT: 'hsl(var(--background))',
                    onlook: 'hsl(var(--background-onlook))',
                    brand: {
                        DEFAULT: 'hsl(var(--background-brand))',
                        secondary: 'hsl(var(--background-brand-secondary))',
                    },
                    primary: 'hsl(var(--background-primary))',
                    secondary: 'hsl(var(--background-secondary))',
                    positive: 'hsl(var(--background-positive))',
                    tertiary: 'hsl(var(--background-tertiary))',
                    'toolbar-base': 'hsl(var(--background-toolbar-base))',
                    hover: 'hsl(var(--background-hover))',
                    active: 'hsl(var(--background-active))',
                },
                foreground: {
                    DEFAULT: 'hsl(var(--foreground))',
                    onlook: 'hsl(var(--foreground-onlook))',
                    brand: 'hsl(var(--foreground-brand))',
                    primary: 'hsl(var(--foreground-primary))',
                    secondary: 'hsl(var(--foreground-secondary))',
                    tertiary: 'hsl(var(--foreground-tertiary))',
                    quadranary: 'hsl(var(--foreground-quadranary))',
                    positive: 'hsl(var(--foreground-positive))',
                    hover: 'hsl(var(--foreground-hover))',
                    active: 'hsl(var(--foreground-active))',
                    disabled: 'hsl(var(--foreground-disabled))',
                },
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
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                icon: {
                    DEFAULT: 'hsl(var(--icon))',
                    active: 'hsl(var(--icon-active))',
                    hover: 'hsl(var(--icon-hover))',
                    disabled: 'hsl(var(--icon-disabled))',
                },
                border: {
                    DEFAULT: 'hsl(var(--border))',
                    active: 'hsl(var(--border-active))',
                    hover: 'hsl(var(--border-hover))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                np: {
                    primary: {
                        card: {
                            background: {
                                DEFAULT: 'var(--np-primary-card-background)',
                                hover: 'var(--np-primary-card-background-hover)',
                            },
                            border: {
                                DEFAULT: 'var(--np-primary-card-border)',
                                hover: 'var(--np-primary-card-border-hover)',
                            },
                            text: 'var(--np-primary-card-text)',
                            subtext: 'var(--np-primary-card-subtext)',
                        },
                        icon: {
                            background: 'var(--np-primary-icon-background)',
                            shape: 'var(--np-primary-icon-shape)',
                        },
                    },
                    secondary: {
                        card: {
                            background: {
                                DEFAULT: 'var(--np-secondary-card-background)',
                                hover: 'var(--np-secondary-card-background-hover)',
                            },
                            border: {
                                DEFAULT: 'var(--np-secondary-card-border)',
                                hover: 'var(--np-secondary-card-border-hover)',
                            },
                            text: 'var(--np-secondary-card-text)',
                            subtext: 'var(--np-secondary-card-subtext)',
                        },
                        icon: {
                            background: 'var(--np-secondary-icon-background)',
                            shape: 'var(--np-secondary-icon-shape)',
                        },
                    },
                },
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            fontSize: {
                title1: [
                    '2.25rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: 'normal',
                    },
                ],
                title2: [
                    '1.5rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: 'normal',
                    },
                ],
                title3: [
                    '1.25rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: 'normal',
                    },
                ],
                largePlus: [
                    '1.125rem',
                    {
                        lineHeight: '1.4',
                        fontWeight: '500',
                    },
                ],
                large: [
                    '1.125rem',
                    {
                        lineHeight: '1.4',
                        fontWeight: 'normal',
                    },
                ],
                regularPlus: [
                    '0.9375rem',
                    {
                        lineHeight: '1.4',
                        fontWeight: '500',
                    },
                ],
                regular: [
                    '0.9375rem',
                    {
                        lineHeight: '1.4',
                        fontWeight: 'normal',
                    },
                ],
                smallPlus: [
                    '0.8125rem',
                    {
                        lineHeight: '1.4',
                        fontWeight: '500',
                    },
                ],
                small: [
                    '0.8125rem',
                    {
                        lineHeight: '1.4',
                        fontWeight: 'normal',
                    },
                ],
                miniPlus: [
                    '0.75rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: '500',
                    },
                ],
                mini: [
                    '0.75rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: 'normal',
                    },
                ],
                microPlus: [
                    '0.6875rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: '500',
                    },
                ],
                micro: [
                    '0.6875rem',
                    {
                        lineHeight: 'normal',
                        fontWeight: 'normal',
                    },
                ],
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
                shine: {
                    '0%': { backgroundPosition: '0% 0%' },
                    '50%': { backgroundPosition: '100% 100%' },
                    '100%': { backgroundPosition: '0% 0%' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '100% 0' },
                    '100%': { backgroundPosition: '-100% 0' },
                },
                'shimmer-vertical': {
                    '0%': { backgroundPosition: '0 100%' },
                    '100%': { backgroundPosition: '0 -100%' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'edit-panel-in': 'edit-panel-in 1s ease',
                'layer-panel-in': 'layer-panel-in 1s ease',
                'toolbar-up': 'toolbar-up 1.25s ease',
                wiggle: 'wiggle 0.5s cubic-bezier(0.25, 1, 0.5, 1) 7s infinite',
                shine: 'shine var(--duration) infinite linear',
                shimmer: 'shimmer 1.5s linear infinite',
                'shimmer-vertical': 'shimmer-vertical 2s linear infinite',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
