import { describe, expect, it } from 'bun:test';
import { parseCommand } from '../electron/main/bun/parse';

describe('parseCommandAndArgs', () => {
    it('should handle simple commands without quotes', () => {
        const result = parseCommand('echo hello world', 'newecho');
        expect(result).toEqual('echo hello world');
    });

    it('should handle quoted arguments', () => {
        const result = parseCommand('npm "hello world" \'another quote\'', 'newecho');
        expect(result).toEqual("newecho 'hello world' 'another quote'");
    });

    it('should replace package manager commands', () => {
        const result = parseCommand('npm install express', 'bun');
        expect(result).toEqual('bun install express');
    });

    it('should combine command args with additional args', () => {
        const result = parseCommand('npm install express --save', 'bun');
        expect(result).toEqual('bun install express --save');
    });

    it('should handle empty command string', () => {
        const result = parseCommand('', 'bun');
        expect(result).toEqual("''");
    });

    it('should handle mixed quoted and unquoted arguments', () => {
        const result = parseCommand('npm install "package name" --save', 'bun');
        expect(result).toEqual("bun install 'package name' --save");
    });
});
