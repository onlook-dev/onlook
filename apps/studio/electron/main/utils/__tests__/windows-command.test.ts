import { escapeWindowsCommand } from '../windows-command';

describe('Windows Command Escaping', () => {
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

    it('should preserve quotes in echo commands', () => {
        const args = ['echo', '"hello"'];
        expect(escapeWindowsCommand(args)).toBe('echo "hello"');
    });

    it('should handle multiple quoted arguments', () => {
        const args = ['copy', 'C:\\Program Files\\file.txt', 'D:\\My Documents\\file.txt'];
        expect(escapeWindowsCommand(args)).toBe(
            'copy "C:\\Program Files\\file.txt" "D:\\My Documents\\file.txt"',
        );
    });
});
