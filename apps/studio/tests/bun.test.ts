import { describe, expect, it } from 'bun:test';
import { parseCommandAndArgs } from '../electron/main/bun/parse';

describe('parseCommandAndArgs', () => {
    it('should handle simple commands without quotes', () => {
        const result = parseCommandAndArgs('echo hello world', [], 'newecho');
        expect(result).toEqual({
            finalCommand: 'echo',
            allArgs: ['hello', 'world'],
        });
    });

    it('should handle quoted arguments', () => {
        const result = parseCommandAndArgs('echo "hello world" \'another quote\'', [], 'newecho');
        expect(result).toEqual({
            finalCommand: 'echo',
            allArgs: ['hello world', 'another quote'],
        });
    });

    it('should replace package manager commands', () => {
        const result = parseCommandAndArgs('npm install express', [], 'bun');
        expect(result).toEqual({
            finalCommand: 'bun',
            allArgs: ['install', 'express'],
        });
    });

    it('should combine command args with additional args', () => {
        const result = parseCommandAndArgs('npm install', ['--save', 'express'], 'bun');
        expect(result).toEqual({
            finalCommand: 'bun',
            allArgs: ['install', '--save', 'express'],
        });
    });

    it('should handle empty command string', () => {
        const result = parseCommandAndArgs('', [], 'bun');
        expect(result).toEqual({
            finalCommand: '',
            allArgs: [],
        });
    });

    it('should handle mixed quoted and unquoted arguments', () => {
        const result = parseCommandAndArgs(
            'npm install "package name" --save',
            ['--verbose'],
            'bun',
        );
        expect(result).toEqual({
            finalCommand: 'bun',
            allArgs: ['install', 'package name', '--save', '--verbose'],
        });
    });
});
