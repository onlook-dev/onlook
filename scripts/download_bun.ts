import extract from 'extract-zip';
import { chmod, exists, mkdir } from 'fs/promises';
import { arch, platform } from 'os';
import { join, resolve } from 'path';

async function downloadBun() {
    // Determine platform and architecture
    const PLATFORM = (() => {
        switch (platform()) {
            case 'darwin': return 'darwin';
            case 'linux': return 'linux';
            case 'win32': return 'win64';
            default: throw new Error('Unsupported platform');
        }
    })();

    const ARCH = (() => {
        // Check for CI environment variable first
        const ciArch = process.env.CI_ARCH;
        if (ciArch) {
            switch (ciArch) {
                case 'x64': return 'x64';
                case 'arm64': return 'aarch64';
                default: throw new Error('Unsupported CI architecture');
            }
        }
        // Fall back to runtime detection
        switch (arch()) {
            case 'x64': return 'x64';
            case 'arm64': return 'aarch64';
            default: throw new Error('Unsupported architecture');
        }
    })();

    const BUN_VERSION = '1.2.2';
    const RESOURCES_DIR = resolve(process.cwd(), 'apps', 'studio', 'resources', 'bun');
    const FILENAME = PLATFORM === 'win64'
        ? `bun-windows-${ARCH}.zip`
        : `bun-${PLATFORM}-${ARCH}.zip`;

    const DOWNLOAD_URL = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${FILENAME}`;
    const BUN_EXECUTABLE = join(RESOURCES_DIR, PLATFORM === 'win64' ? 'bun.exe' : 'bun');

    // Check if Bun is already downloaded
    if (await exists(BUN_EXECUTABLE)) {
        console.log(`Bun is already downloaded at: ${BUN_EXECUTABLE}`);
        return;
    }

    // Create resources directory if it doesn't exist
    await mkdir(RESOURCES_DIR, { recursive: true });

    // Download and extract Bun
    console.log(`Downloading Bun from ${DOWNLOAD_URL}`);

    const zipPath = join(RESOURCES_DIR, 'bun.zip');

    // Download file using Bun's fetch
    const response = await fetch(DOWNLOAD_URL);
    if (!response.ok) {
        throw new Error(`Failed to download Bun: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    await Bun.write(zipPath, buffer);

    // Extract using extract-zip, stripping the directory structure
    await extract(zipPath, {
        dir: RESOURCES_DIR,
        onEntry: (entry) => {
            entry.fileName = entry.fileName.split('/').pop()!;
        },
    });

    // Make the binary executable on Unix-like systems
    if (PLATFORM !== 'win64') {
        await chmod(BUN_EXECUTABLE, 0o755);
    }

    // Clean up zip file
    await Bun.file(zipPath).delete();

    console.log(`Bun has been downloaded and installed to: ${RESOURCES_DIR}`);
}

await downloadBun();
