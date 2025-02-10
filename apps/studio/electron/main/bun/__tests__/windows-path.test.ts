import { escapeWindowsPath } from '../../utils/windows-path';
import { replaceCommand } from '../parse';

describe('Windows Path Handling', () => {
    const originalPlatform = process.platform;

    beforeAll(() => {
        Object.defineProperty(process, 'platform', {
            value: 'win32',
        });
    });

    afterAll(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
        });
    });

    describe('escapeWindowsPath', () => {
        it('should wrap paths with spaces in quotes', () => {
            const path = 'C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe';
            expect(escapeWindowsPath(path)).toBe(
                '"C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe"',
            );
        });

        it('should not modify paths without spaces', () => {
            const path = 'C:\\Users\\JohnDoe\\AppData\\Local\\Programs\\bun.exe';
            expect(escapeWindowsPath(path)).toBe(path);
        });

        it('should handle paths with special characters', () => {
            const path = 'C:\\Users\\John&Doe\\AppData\\Local\\Programs\\bun.exe';
            expect(escapeWindowsPath(path)).toBe(
                '"C:\\Users\\John&Doe\\AppData\\Local\\Programs\\bun.exe"',
            );
        });
    });

    describe('replaceCommand integration', () => {
        it('should properly escape bun path in npm commands', () => {
            const bunPath = 'C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe';
            const npmCommand = 'npm run build';
            const result = replaceCommand(npmCommand, bunPath);
            expect(result).toBe(
                '"C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe" run build',
            );
        });

        it('should not modify non-npm commands', () => {
            const bunPath = 'C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe';
            const otherCommand = 'echo "hello"';
            const result = replaceCommand(otherCommand, bunPath);
            expect(result).toBe('echo "hello"');
        });
    });
});
