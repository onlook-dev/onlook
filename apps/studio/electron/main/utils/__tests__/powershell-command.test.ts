import { buildPowerShellCommand } from '../powershell-command';

describe('PowerShell Command Building', () => {
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

    it('should handle paths with spaces', () => {
        const result = buildPowerShellCommand('C:\\Program Files\\bun.exe', ['run', 'build']);
        expect(result).toBe('& "C:\\Program Files\\bun.exe" run build');
    });

    it('should preserve existing quotes in arguments', () => {
        const result = buildPowerShellCommand('C:\\bun.exe', ['echo', '"hello world"']);
        expect(result).toBe('& C:\\bun.exe echo "hello world"');
    });

    it('should handle special characters in paths', () => {
        const result = buildPowerShellCommand('C:\\Users\\John&Doe\\bun.exe');
        expect(result).toBe('& "C:\\Users\\John&Doe\\bun.exe"');
    });
});
