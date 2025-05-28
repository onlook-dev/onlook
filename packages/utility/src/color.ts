import colorNamer from 'color-namer';
import type cssColorNames from 'css-color-names';
import { oklch, rgb } from 'culori';
import parseCSSColor from 'parse-css-color';
import { isNearEqual } from './math';

export function isColorEmpty(colorValue: string) {
    const color = Color.from(colorValue);
    return color.a === 0 || color.isEqual(Color.transparent);
}

export function formatHexString(hex: string): string {
    if (/^#?[0-9a-fA-F]{1,2}$/.exec(hex)) {
        const s = hex.replace('#', '');
        return '#' + s + s + s;
    }
    if (/^[0-9a-fA-F]{3,}$/.exec(hex)) {
        return '#' + hex;
    }
    return hex;
}

export function parseHslValue(value: string): Color | null {
    let h = 0,
        s = 0,
        l = 0,
        a = 1;

    if (value.includes('hsl')) {
        const hslMatch = value.match(
            /hsla?\(\s*([^,\s]+)(?:deg)?\s*[,\s]\s*([^,\s]+)%\s*[,\s]\s*([^,\s]+)%\s*(?:[,/]\s*([^)]+))?\s*\)/,
        );

        if (hslMatch) {
            // Parse hue with unit support
            const hueValue = hslMatch[1];
            h = parseHueValue(hueValue ?? '0');
            s = parseFloat(hslMatch[2] ?? '0');
            l = parseFloat(hslMatch[3] ?? '0');

            if (hslMatch[4]) {
                a = hslMatch[4].endsWith('%')
                    ? parseFloat(hslMatch[4]) / 100
                    : parseFloat(hslMatch[4]);
            }
        } else {
            return null;
        }
    } else {
        // Parse space-separated format
        const parts = value.split(/\s+/);
        if (parts.length >= 3) {
            h = parseFloat(parts[0] ?? '0');
            s = parseFloat(parts[1]?.replace('%', '') ?? '0');
            l = parseFloat(parts[2]?.replace('%', '') ?? '0');

            if (parts.length >= 4) {
                a = parts[3]?.endsWith('%')
                    ? parseFloat(parts[3]) / 100
                    : parseFloat(parts[3] ?? '0');
            }
        } else {
            return null;
        }
    }

    // Normalize values
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    a = Math.max(0, Math.min(1, a));

    return Color.hsl({
        h: h / 360,
        s: s / 100,
        l: l / 100,
        a,
    });
}

function parseHueValue(value: string): number {
    if (value.endsWith('turn')) {
        return parseFloat(value) * 360;
    }
    if (value.endsWith('rad')) {
        return parseFloat(value) * (180 / Math.PI);
    }
    if (value.endsWith('grad')) {
        return parseFloat(value) * 0.9;
    }
    return parseFloat(value);
}

export function parseOklchValue(value: string): Color | null {
    let l = 0,
        c = 0,
        h = 0,
        a = 1;

    if (value.includes('oklch')) {
        const oklchMatch = value.match(
            /oklch\(\s*([^,\s]+)%?\s*[,\s]\s*([^,\s]+)\s*[,\s]\s*([^,\s]+)(?:deg)?\s*(?:[,/]\s*([^)]+))?\s*\)/,
        );

        if (oklchMatch) {
            l = oklchMatch[1]?.trim().endsWith('%')
                ? parseFloat(oklchMatch[1]) / 100
                : parseFloat(oklchMatch[1] ?? '0');
            c = parseFloat(oklchMatch[2] ?? '0');

            // Parse hue with unit support
            const hueValue = oklchMatch[3];
            h = parseHueValue(hueValue ?? '0');

            if (oklchMatch[4]) {
                a = oklchMatch[4].endsWith('%')
                    ? parseFloat(oklchMatch[4]) / 100
                    : parseFloat(oklchMatch[4]);
            }
        } else {
            return null;
        }
    } else {
        // Parse space-separated format: "l c h / a"
        const parts = value.split(/\s+/);
        if (parts.length >= 3) {
            l = parseFloat(parts[0]?.replace('%', '') ?? '0');
            c = parseFloat(parts[1] ?? '0');
            h = parseFloat(parts[2] ?? '0');

            // Check for alpha after slash
            const slashIndex = parts.findIndex((part) => part === '/');
            if (slashIndex !== -1 && parts[slashIndex + 1]) {
                const alphaPart = parts[slashIndex + 1];
                a = alphaPart?.endsWith('%')
                    ? parseFloat(alphaPart) / 100
                    : parseFloat(alphaPart ?? '1');
            }
        } else {
            return null;
        }
    }

    // Normalize values
    l = Math.max(0, Math.min(1, l));
    c = Math.max(0, c);
    h = ((h % 360) + 360) % 360;
    a = Math.max(0, Math.min(1, a));

    return Color.oklch({ l, c, h, a });
}

export interface Palette {
    name: string;
    colors: {
        [key: number]: string;
    };
}

export class Color {
    constructor(opts: { h: number; s: number; v: number; a?: number }) {
        this.h = opts.h;
        this.s = opts.s;
        this.v = opts.v;
        this.a = opts.a ?? 1;
    }

    static get white(): Color {
        return new Color({ h: 0, s: 0, v: 1 });
    }
    static get black(): Color {
        return new Color({ h: 0, s: 0, v: 0 });
    }
    static get transparent(): Color {
        return new Color({ h: 0, s: 0, v: 0, a: 0 });
    }

    static rgb(rgb: { r: number; g: number; b: number; a?: number }): Color {
        return new Color({ ...rgb2hsv(rgb), a: rgb.a ?? 1 });
    }
    static hsl(hsl: { h: number; s: number; l: number; a?: number }): Color {
        return new Color({ ...hsl2hsv(hsl), a: hsl.a ?? 1 });
    }

    static oklch(oklchColor: { l: number; c: number; h: number; a?: number }): Color {
        // Convert OKLCH to RGB using culori
        const oklchInput = {
            mode: 'oklch' as const,
            l: oklchColor.l,
            c: oklchColor.c,
            h: oklchColor.h,
            alpha: oklchColor.a ?? 1,
        };

        const rgbColor = rgb(oklchInput);

        if (!rgbColor) {
            return Color.transparent;
        }

        return Color.rgb({
            r: rgbColor.r ?? 0,
            g: rgbColor.g ?? 0,
            b: rgbColor.b ?? 0,
            a: rgbColor.alpha ?? 1,
        });
    }

    static from(name: keyof typeof cssColorNames): Color;
    static from(name: string): Color;

    static from(str: string): Color {
        // First try to parse as OKLCH
        if (str.includes('oklch') || /^\s*[\d.]+\s+[\d.]+\s+[\d.]+/.test(str)) {
            const oklchColor = parseOklchValue(str);
            if (oklchColor) {
                return oklchColor;
            }
        }

        const color = parseCSSColor(formatHexString(str));
        if (color) {
            if (color.type === 'rgb') {
                return Color.rgb({
                    r: (color.values[0] ?? 0) / 255,
                    g: (color.values[1] ?? 0) / 255,
                    b: (color.values[2] ?? 0) / 255,
                    a: color.alpha ?? 1,
                });
            } else if (color.type === 'hsl') {
                return Color.hsl({
                    h: (color.values[0] ?? 0) / 360,
                    s: (color.values[1] ?? 0) / 100,
                    l: (color.values[2] ?? 0) / 100,
                    a: color.alpha ?? 1,
                });
            }
        }
        return Color.transparent;
    }

    static mix(color0: Color, color1: Color, ratio: number): Color {
        const rgb0 = color0.rgb;
        const rgb1 = color1.rgb;

        const r = rgb0.r * (1 - ratio) + rgb1.r * ratio;
        const g = rgb0.g * (1 - ratio) + rgb1.g * ratio;
        const b = rgb0.b * (1 - ratio) + rgb1.b * ratio;
        const a = rgb0.a * (1 - ratio) + rgb1.a * ratio;

        return new Color({ ...rgb2hsv({ r, g, b }), a });
    }

    readonly h: number;
    readonly s: number;
    readonly v: number;
    readonly a: number;

    private _name: string | undefined;

    lighten(intensity: number): Color {
        const { h, s, l } = this.hsl;
        const newColor = {
            h,
            s,
            l: Math.min(l + (1 - l) * intensity, 1),
            a: this.a,
        };
        return Color.hsl(newColor);
    }

    darken(intensity: number): Color {
        const { h, s, l } = this.hsl;
        const newColor = {
            h,
            s,
            l: Math.max(l - l * intensity, 0),
            a: this.a,
        };
        return Color.hsl(newColor);
    }

    get palette(): Palette {
        const name = this.name;

        const palette: Palette = {
            name,
            colors: {
                500: this.toString(),
            },
        };

        const intensityMap: {
            [key: number]: number;
        } = {
            50: 0.9,
            100: 0.8,
            200: 0.595,
            300: 0.415,
            400: 0.21,
            500: 0.0,
            600: 0.21,
            700: 0.415,
            800: 0.595,
            900: 0.8,
            950: 0.9,
        };

        [50, 100, 200, 300, 400].forEach((level) => {
            palette.colors[level] = this.lighten(intensityMap[level] ?? 0).toString();
        });

        [600, 700, 800, 900, 950].forEach((level) => {
            palette.colors[level] = this.darken(intensityMap[level] ?? 0).toString();
        });

        return palette;
    }

    toHex6(): string {
        const { r, g, b } = this.rgb;
        return (
            '#' +
            [r, g, b]
                .map((c) => {
                    const str = Math.round(c * 255)
                        .toString(16)
                        .toUpperCase();
                    return str.length === 1 ? '0' + str : str;
                })
                .join('')
        );
    }

    toHex8(): string {
        const { r, g, b, a } = this.rgb;
        return (
            '#' +
            [r, g, b, a]
                .map((c) => {
                    const str = Math.round(c * 255)
                        .toString(16)
                        .toUpperCase();
                    return str.length === 1 ? '0' + str : str;
                })
                .join('')
        );
    }

    toHex(): string {
        if (this.a > 0.999) {
            return this.toHex6();
        } else {
            return this.toHex8();
        }
    }

    toString(): string {
        return this.toHex();
    }

    isEqual(other: Color): boolean {
        return (
            isNearEqual(this.h, other.h, 0.001) &&
            isNearEqual(this.s, other.s, 0.001) &&
            isNearEqual(this.v, other.v, 0.001) &&
            isNearEqual(this.a, other.a, 0.001)
        );
    }

    get rgb(): { r: number; g: number; b: number; a: number } {
        return { ...hsv2rgb(this), a: this.a };
    }
    get hsl(): { h: number; s: number; l: number; a: number } {
        return { ...hsv2hsl(this), a: this.a };
    }

    get name(): string {
        return this._name
            ? this._name
            : (colorNamer(this.toHex6()).ntc[0]?.name?.toLowerCase().replace(' ', '-') ?? '');
    }

    set name(newName: string) {
        this._name = newName;
    }

    withAlpha(a: number): Color {
        return new Color({ ...this, a });
    }
}

// https://stackoverflow.com/a/54116681
function hsl2hsv({ h, s, l }: { h: number; s: number; l: number }): {
    h: number;
    s: number;
    v: number;
} {
    const v = s * Math.min(l, 1 - l) + l;
    return { h, s: v ? 2 - (2 * l) / v : 0, v };
}

function hsv2hsl({ h, s, v }: { h: number; s: number; v: number }): {
    h: number;
    s: number;
    l: number;
} {
    const l = v - (v * s) / 2;
    const m = Math.min(l, 1 - l);
    return { h, s: m ? (v - l) / m : 0, l };
}

// https://stackoverflow.com/a/54024653
function hsv2rgb({ h, s, v }: { h: number; s: number; v: number }): {
    r: number;
    g: number;
    b: number;
} {
    const f = (n: number, k = (n + h * 6) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return { r: f(5), g: f(3), b: f(1) };
}

// https://stackoverflow.com/a/54070620
function rgb2hsv({ r, g, b }: { r: number; g: number; b: number }): {
    h: number;
    s: number;
    v: number;
} {
    const v = Math.max(r, g, b),
        c = v - Math.min(r, g, b);
    const h = c && (v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c);
    return { h: (h < 0 ? h + 6 : h) / 6, s: v && c / v, v };
}
