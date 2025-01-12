// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { isBinary, isText } from 'istextorbinary';

describe('istextorbinary', () => {
    test('should identify text files', () => {
        expect(isText('test.txt')).toBe(true);
        expect(isText('test.js')).toBe(true);
        expect(isText('test.html')).toBe(true);
        expect(isText('test.css')).toBe(true);
    });

    test('should identify binary files', () => {
        expect(isBinary('test.png')).toBe(true);
        expect(isBinary('test.jpg')).toBe(true);
        expect(isBinary('test.pdf')).toBe(true);
    });

    test('should identify text content', () => {
        const textContent = Buffer.from('Hello, world!');
        expect(isText(null, textContent)).toBe(true);
    });

    test('should identify binary content', () => {
        // Create a small binary buffer with some non-text bytes
        const binaryContent = Buffer.from([0xff, 0x00, 0x00, 0xff]);
        expect(isBinary(null, binaryContent)).toBe(true);
    });

    test('should handle both filename and content together', () => {
        const textContent = Buffer.from('Hello, world!');
        const binaryContent = Buffer.from([0xff, 0x00, 0x00, 0xff]);

        // Test text file with text content
        expect(isText('test.txt', textContent)).toBe(true);

        // Test binary file with binary content
        expect(isBinary('test.png', binaryContent)).toBe(true);

        // Test binary file with text content
        expect(isBinary('test.png', textContent)).toBe(true);

        // Test text file with binary content
        expect(isText('test.txt', binaryContent)).toBe(true);
    });
});
