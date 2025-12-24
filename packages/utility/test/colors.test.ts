import { describe, it, expect } from 'bun:test';
import { Color, type Palette } from '../src/color';

describe('ColorUtil', () => {
    describe('Color From Hex-Like String', () => {
        it('should create a color', () => {
            expect(Color.from('fff')?.toHex8()).toEqual('#FFFFFFFF');
            expect(Color.from('000')?.toHex8()).toEqual('#000000FF');
            expect(Color.from('2')?.toHex8()).toEqual('#222222FF');
            expect(Color.from('34')?.toHex8()).toEqual('#343434FF');
            expect(Color.from('123')?.toHex8()).toEqual('#112233FF');
            expect(Color.from('123456')?.toHex8()).toEqual('#123456FF');
            expect(Color.from('12345678')?.toHex8()).toEqual('#12345678');
            expect(Color.from('#2')?.toHex8()).toEqual('#222222FF');
            expect(Color.from('#34')?.toHex8()).toEqual('#343434FF');
            expect(Color.from('#123')?.toHex8()).toEqual('#112233FF');
            expect(Color.from('#123456')?.toHex8()).toEqual('#123456FF');
            expect(Color.from('#12345678')?.toHex8()).toEqual('#12345678');
        });
    });

    describe('Color From cssColor names', () => {
        it('should create a color', () => {
            expect(Color.from('black')?.toHex8()).toEqual('#000000FF');
            expect(Color.from('white')?.toHex8()).toEqual('#FFFFFFFF');
            expect(Color.from('pink')?.toHex8()).toEqual('#FFC0CBFF');
            expect(Color.from('red')?.toHex8()).toEqual('#FF0000FF');
        });
    });

    describe('Color Names', () => {
        it('should name colors', () => {
            expect(Color.from('F')?.name).toEqual('white');
            expect(Color.black.name).toEqual('black');
        });
    });

    describe('Color Palette', () => {
        it('should create palette', () => {
            const palette = Color.from('blue')?.palette;
            const expectPalette: Palette = {
                name: 'blue',
                colors: {
                    50: '#E5E5FF',
                    100: '#CCCCFF',
                    200: '#9898FF',
                    300: '#6A6AFF',
                    400: '#3636FF',
                    500: '#0000FF',
                    600: '#0000C9',
                    700: '#000095',
                    800: '#000067',
                    900: '#000033',
                    950: '#000019',
                },
            };
            expect(palette).toEqual(expectPalette);
        });
    });

    describe('Unknown Colors', () => {
        it('should return transparent color for invalid input', () => {
            expect(Color.from('not-a-color')).toEqual(Color.transparent);
            expect(Color.from('not-a-color').toHex8()).toEqual('#00000000');
        });
    });
});
