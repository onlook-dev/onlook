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

    it('should preserve different background properties that do not conflict', () => {
        const complexBg = "p-6 bg-repeat bg-[url('/sea.jpg')] bg-auto bg-center bg-repeat";
        const result = customTwMerge(complexBg);

        // Should preserve all non-conflicting background properties
        expect(result).toContain('p-6');
        expect(result).toContain("bg-[url('/sea.jpg')]");
        expect(result).toContain('bg-auto');
        expect(result).toContain('bg-center');
        expect(result).toContain('bg-repeat');
    });

    it('should handle conflicting background-size classes correctly', () => {
        const result = customTwMerge('bg-auto bg-cover bg-contain');
        expect(result).toBe('bg-contain');
    });

    it('should handle conflicting background-repeat classes correctly', () => {
        const result = customTwMerge('bg-repeat bg-no-repeat bg-repeat-x');
        expect(result).toBe('bg-repeat-x');
    });

    it('should handle conflicting background-position classes correctly', () => {
        const result = customTwMerge('bg-center bg-top bg-bottom bg-left');
        expect(result).toBe('bg-left');
    });

    it('should preserve different background properties while resolving conflicts within same property type', () => {
        const result = customTwMerge(
            'bg-red-500 bg-repeat bg-center bg-cover bg-blue-600 bg-no-repeat',
        );

        expect(result).toContain('bg-blue-600');
        expect(result).toContain('bg-no-repeat');
        expect(result).toContain('bg-center');
        expect(result).toContain('bg-cover');
        expect(result).not.toContain('bg-red-500');
        expect(result).not.toContain('bg-repeat');
    });

    it('should handle background images with other background properties', () => {
        const result = customTwMerge(
            "bg-[url('/image1.jpg')] bg-cover bg-[url('/image2.jpg')] bg-center",
        );

        expect(result).toContain("bg-[url('/image2.jpg')]");
        expect(result).toContain('bg-cover');
        expect(result).toContain('bg-center');
        expect(result).not.toContain("bg-[url('/image1.jpg')]");
    });

    it('should handle complex position classes like bg-left-top and bg-right-bottom', () => {
        const result = customTwMerge('bg-left-top bg-center bg-right-bottom');
        expect(result).toBe('bg-right-bottom');
    });

    it('should handle background attachment classes', () => {
        const result = customTwMerge('bg-fixed bg-local bg-scroll bg-red-500');
        expect(result).toContain('bg-scroll');
        expect(result).toContain('bg-red-500');
    });

    it('should handle arbitrary background values correctly', () => {
        const result = customTwMerge(
            'bg-[#abc123] bg-[length:200px_100px] bg-[url(data:image/svg+xml;base64,abc)]',
        );
        expect(result).toContain('bg-[url(data:image/svg+xml;base64,abc)]');
    });

    it('should preserve non-background classes while processing background classes', () => {
        const result = customTwMerge('text-red-500 bg-blue-500 p-4 m-2 bg-green-600 border-2');
        expect(result).toContain('text-red-500');
        expect(result).toContain('p-4');
        expect(result).toContain('m-2');
        expect(result).toContain('border-2');
        expect(result).toContain('bg-green-600');
        expect(result).not.toContain('bg-blue-500');
    });

    it('should handle empty and undefined inputs gracefully', () => {
        expect(customTwMerge('')).toBe('');
        expect(customTwMerge()).toBe('');
        expect(customTwMerge(null, undefined, '')).toBe('');
    });

    it('should handle array inputs', () => {
        const result = customTwMerge(['bg-red-500', 'p-4'], ['bg-blue-600', 'text-white']);
        expect(result).toContain('bg-blue-600');
        expect(result).toContain('p-4');
        expect(result).toContain('text-white');
        expect(result).not.toContain('bg-red-500');
    });
});
