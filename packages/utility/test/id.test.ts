import { describe, expect, it } from 'bun:test';
import { shortenUuid } from '../src/id';

describe('shortenUuid', () => {
    it('should produce consistent output for same input', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const first = shortenUuid(uuid, 32);
        const second = shortenUuid(uuid, 32);
        expect(first).toBe(second);
    });

    it('should produce different outputs for different inputs', () => {
        const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
        const uuid2 = '123e4567-e89b-12d3-a456-426614174001';
        const first = shortenUuid(uuid1, 32);
        const second = shortenUuid(uuid2, 32);
        expect(first).not.toBe(second);
    });

    it('should respect maxLength parameter', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const shortened = shortenUuid(uuid, 10);
        expect(shortened.length).toBe(10);
        // Should be padded with zeros if needed
        expect(shortened).toMatch(/^[0-9a-z]+$/);
    });

    it('should handle empty string', () => {
        const uuid = '';
        const shortened = shortenUuid(uuid, 32);
        // Empty string should hash to all zeros
        expect(shortened).toBe('0'.repeat(32));
    });

    it('should produce alphanumeric output', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const shortened = shortenUuid(uuid, 32);
        expect(shortened).toMatch(/^[0-9a-z]+$/);
        expect(shortened.length).toBe(32);
    });

    it('should handle very long input strings', () => {
        const longUuid = '123e4567-e89b-12d3-a456-426614174000'.repeat(10);
        const shortened = shortenUuid(longUuid, 32);
        expect(shortened.length).toBe(32);
        expect(shortened).toMatch(/^[0-9a-z]+$/);
    });

    it('should handle special characters in input', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000!@#$%^&*()';
        const shortened = shortenUuid(uuid, 32);
        expect(shortened.length).toBe(32);
        expect(shortened).toMatch(/^[0-9a-z]+$/);
    });
});
