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

    // Modified to handle multiple architectures for macOS
    const ARCHITECTURES = PLATFORM === 'darwin'
        ? ['x64', 'aarch64']
        : [(() => {
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
        })()];

    const BUN_VERSION = '1.2.4';
    const RESOURCES_DIR = resolve(process.cwd(), 'apps', 'studio', 'resources', 'bun');

    // Create resources directory if it doesn't exist
    await mkdir(RESOURCES_DIR, { recursive: true });

    // Download for each architecture
    for (const ARCH of ARCHITECTURES) {
        const FILENAME = PLATFORM === 'win64'
            ? `bun-windows-${ARCH}-baseline.zip`
            : `bun-${PLATFORM}-${ARCH}.zip`;

        const DOWNLOAD_URL = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${FILENAME}`;
        const BUN_EXECUTABLE = join(
            RESOURCES_DIR,
            PLATFORM === 'win64'
                ? 'bun.exe'
                : `bun-${ARCH}`  // Add architecture to the filename
        );

        // Check if this version is already downloaded
        if (await exists(BUN_EXECUTABLE)) {
            console.log(`Bun ${ARCH} is already downloaded at: ${BUN_EXECUTABLE}`);
            continue;
        }

        // Download and extract Bun
        console.log(`Downloading Bun ${ARCH} from ${DOWNLOAD_URL}`);

        const zipPath = join(RESOURCES_DIR, `bun-${ARCH}.zip`);

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
                // Rename the bun executable to include architecture
                const fileName = entry.fileName.split('/').pop()!;
                entry.fileName = fileName === 'bun' ? `bun-${ARCH}` : fileName;
            },
        });

        // Make the binary executable on Unix-like systems
        if (PLATFORM !== 'win64') {
            await chmod(BUN_EXECUTABLE, 0o755);
        }

        // Clean up zip file
        await Bun.file(zipPath).delete();

        console.log(`Bun ${ARCH} has been downloaded and installed to: ${RESOURCES_DIR}`);
    }
}

await downloadBun();
