import { describe, expect, it } from 'bun:test';
import { CssToTailwindTranslator } from '../src/tailwind';

const translateWidth = (val: string) => {
    const res = CssToTailwindTranslator(`.a{width:${val};}`);
    return res.data[0]?.resultVal || '';
};

describe('isUnit validation via width property', () => {
    it('rejects empty values', () => {
        expect(translateWidth('')).toBe('');
    });

    it('rejects invalid unit strings', () => {
        expect(translateWidth('abc')).toBe('');
    });

    it('accepts px units', () => {
        expect(translateWidth('10px')).toBe('w-[10px]');
    });

    it('accepts numeric values', () => {
        expect(translateWidth('10')).toBe('w-[10]');
    });

    it('converts known percentages', () => {
        expect(translateWidth('50%')).toBe('w-1/2');
    });
});
