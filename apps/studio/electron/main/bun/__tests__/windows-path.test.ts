import { replaceCommand } from '../parse';

describe('Windows Path Handling', () => {
    const originalPlatform = process.platform;

    beforeAll(() => {
        Object.defineProperty(process, 'platform', {
            value: 'win32',
            configurable: true,
            writable: true,
        });
    });

    afterAll(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
        });
    });

    describe('replaceCommand integration', () => {
        it('should properly escape bun path in npm commands', () => {
            const bunPath = 'C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe';
            const npmCommand = 'npm run build';
            const result = replaceCommand(npmCommand, bunPath);
            expect(result).toBe(
                '& "C:\\Users\\John Doe\\AppData\\Local\\Programs\\bun.exe" run build',
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
