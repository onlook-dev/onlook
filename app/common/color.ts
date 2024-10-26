import colorNamer from 'color-namer';
import cssColorNames from 'css-color-names';
import parseCSSColor from 'parse-css-color';
import { isNearEqual } from './helpers/math';

export function isColorEmpty(colorValue: string) {
    const EMPTY_COLOR_VALUES = ['', 'initial', 'transparent', 'none', '#00000000'];
    return EMPTY_COLOR_VALUES.includes(colorValue);
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
        return new Color({ ...rgb2hsv(rgb), a: rgb.a });
    }
    static hsl(hsl: { h: number; s: number; l: number; a?: number }): Color {
        return new Color({ ...hsl2hsv(hsl), a: hsl.a });
    }

    static from(name: keyof typeof cssColorNames): Color;
    static from(name: string): Color;

    static from(str: string): Color {
        const color = parseCSSColor(formatHexString(str));
        if (color) {
            if (color.type === 'rgb') {
                return Color.rgb({
                    r: color.values[0] / 255,
                    g: color.values[1] / 255,
                    b: color.values[2] / 255,
                    a: color.alpha,
                });
            } else if (color.type === 'hsl') {
                return Color.hsl({
                    h: color.values[0] / 360,
                    s: color.values[1] / 100,
                    l: color.values[2] / 100,
                    a: color.alpha,
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
            palette.colors[level] = this.lighten(intensityMap[level]).toString();
        });

        [600, 700, 800, 900, 950].forEach((level) => {
            palette.colors[level] = this.darken(intensityMap[level]).toString();
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
            : colorNamer(this.toHex6()).ntc[0].name.toLowerCase().replace(' ', '-');
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
