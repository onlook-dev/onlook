import { cpus } from 'os';
import log from 'electron-log';

export function checkCPUCompatibility(): { compatible: boolean; reason?: string } {
    if (process.platform !== 'win32') {
        return { compatible: true };
    }

    const cpuInfo = cpus()[0];

    if (!cpuInfo) {
        log.warn('Could not detect CPU information');
        return { compatible: true };
    }

    const hasAVX = cpuInfo.model.toLowerCase().includes('avx');

    if (!hasAVX) {
        return {
            compatible: false,
            reason: 'Your CPU does not support AVX instructions which are required for some features. Please use a newer CPU or contact support for assistance.',
        };
    }

    return { compatible: true };
}
