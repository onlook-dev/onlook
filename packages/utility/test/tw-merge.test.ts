import { customTwMerge } from '../src/tw-merge';

describe('customTwMerge', () => {
    const gradient =
        'bg-[conic-gradient(from_0deg,_#ff6b6bff_0%,_#feca57ff_33%,_#48cae4ff_66%,_#ff6b6bff_100%)]';
    const color = 'bg-[#ff6b6b]';
    it('should keep the last background color class when multiple are in a single string', () => {
        const result = customTwMerge(gradient, color);
        expect(result).toBe(color);
    });

    it('should keep the last background color class when passed as separate arguments', () => {
        const result = customTwMerge(gradient, color);
        expect(result).toBe(color);
    });

    it('should keep the last background color class when passed as separate arguments', () => {
        const result = customTwMerge(color, gradient);
        expect(result).toBe(gradient);
    });

    it('should keep the last background color class when multiple are in a single string', () => {
        const result = customTwMerge(`${gradient} ${color}`);
        expect(result).toBe(color);
    });

    it('should keep the last background color class when multiple are in a single string', () => {
        const result = customTwMerge(`${gradient} ${color}`);
        expect(result).toBe(color);
    });

    it('should keep the last background color class when multiple are in a single string', () => {
        const result = customTwMerge(`${color} ${gradient}`);
        expect(result).toBe(gradient);
    });
});
