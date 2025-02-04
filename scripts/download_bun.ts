import extract from 'extract-zip';
import { chmod, exists, mkdir, unlink } from 'fs/promises';
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
        switch (arch()) {
            case 'x64': return 'x64';
            case 'arm64': return 'aarch64';
            default: throw new Error('Unsupported architecture');
        }
    })();

    const BUN_VERSION = '1.2.2';
    const RESOURCES_DIR = resolve(process.cwd(), 'apps', 'studio', 'resources', 'bun');
    const FILENAME = (() => {
        if (PLATFORM === 'win64') return `bun-windows-${ARCH}-baseline.zip`;
        if (PLATFORM === 'darwin' && ARCH === 'x64') return `bun-darwin-${ARCH}-baseline.zip`;
        return `bun-${PLATFORM}-${ARCH}.zip`;
    })();

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
    console.log(`Downloading Bun from ${DOWNLOAD_URL}...`);

    const zipPath = join(RESOURCES_DIR, 'bun.zip');

    // Download SHASUMS256.txt
    const shasumsUrl = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/SHASUMS256.txt`;
    const shasumsResponse = await fetch(shasumsUrl);
    const shasums = await shasumsResponse.text();

    // Download file using Bun's fetch
    const response = await fetch(DOWNLOAD_URL);
    if (!response.ok) {
        throw new Error(`Failed to download Bun: ${response.status} ${response.statusText}`);
    }
    await Bun.write(zipPath, response);

    // Verify checksum
    const fileBuffer = await Bun.file(zipPath).arrayBuffer();
    const fileHash = await crypto.subtle.digest('SHA-256', fileBuffer);
    const fileHashHex = Array.from(new Uint8Array(fileHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    const expectedHash = shasums.split('\n')
        .find(line => line.includes(FILENAME))
        ?.split(/\s+/)[0];

    if (!expectedHash) {
        throw new Error(`Could not find SHA256 hash for ${FILENAME} in SHASUMS256.txt`);
    }

    if (fileHashHex !== expectedHash) {
        throw new Error(`SHA256 verification failed for ${FILENAME}`);
    }

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
    await unlink(zipPath);

    console.log(`Bun has been downloaded and installed to: ${RESOURCES_DIR}`);
}

await downloadBun();
