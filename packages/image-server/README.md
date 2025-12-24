# @onlook/image-server

Server-side image processing utilities for Onlook using Sharp.

## ⚠️ IMPORTANT WARNING

**This package contains Node.js-only dependencies (Sharp) and MUST NOT be imported in browser or preload scripts.**

- ✅ **Safe to use in**: Node.js servers, API routes, server-side functions
- ❌ **DO NOT use in**: Browser code, Electron preload scripts, client-side components

## Installation

This package is part of the Onlook monorepo and should be added as a dependency to packages that need server-side image processing.

```json
{
    "dependencies": {
        "@onlook/image-server": "*"
    }
}
```

## Usage

### Basic Image Compression

```typescript
import { compressImageServer } from '@onlook/image-server';

// Compress and save to file
const result = await compressImageServer('input.jpg', 'output.webp', {
    quality: 80,
    format: 'webp',
});

// Compress to buffer
const result = await compressImageServer('input.jpg', undefined, { quality: 70 });
```

### Batch Processing

```typescript
import { batchCompressImagesServer } from '@onlook/image-server';

const results = await batchCompressImagesServer(
    ['image1.jpg', 'image2.png'],
    './output-directory',
    { format: 'webp', quality: 85 },
);
```

### Using Compression Presets

```typescript
import { compressImageServer } from '@onlook/image-server';
import { COMPRESSION_IMAGE_PRESETS } from '@onlook/constants';

// Use predefined presets
const result = await compressImageServer('input.jpg', 'output.webp', COMPRESSION_IMAGE_PRESETS.web);
```

## Supported and Skipped Formats

### ✅ Supported Input Formats

- **JPEG/JPG**: Lossy compression, good for photos
- **PNG**: Lossless compression, supports transparency
- **WebP**: Modern format with excellent compression
- **TIFF/TIF**: High-quality images
- **GIF**: Animated/static images (converted to static)
- **BMP**: Bitmap images

### ⏭️ Skipped Formats

The following formats are **automatically skipped** and return an error:

- **ICO**: Icon files are already optimized and used as-is (favicons, app icons)
- **SVG**: Vector graphics don't need compression and should remain scalable

```typescript
// These will return { success: false, error: "Skipping ICO/SVG file..." }
await compressImageServer('favicon.ico', 'output.webp'); // ❌ Skipped
await compressImageServer('logo.svg', 'output.png'); // ❌ Skipped
```

**Why skip ICO and SVG?**

- **ICO files** are already optimized for their use case (favicons, app icons)
- **SVG files** are vector graphics that should remain scalable, not converted to raster
- Use the original files directly instead of compressing them

## API

### `compressImageServer(input, outputPath?, options?)`

Compresses a single image.

**Parameters:**

- `input`: string | Buffer - File path or image buffer
- `outputPath`: string (optional) - Output file path. If not provided, returns buffer
- `options`: CompressionOptions (optional) - Compression settings

**Returns:** Promise<CompressionResult>

### `batchCompressImagesServer(inputPaths, outputDir, options?)`

Compresses multiple images in batch. ICO and SVG files are automatically skipped.

**Parameters:**

- `inputPaths`: string[] - Array of input file paths
- `outputDir`: string - Output directory
- `options`: CompressionOptions (optional) - Compression settings

**Returns:** Promise<CompressionResult[]> - Results include both successful compressions and skipped files

## Output Formats

- **JPEG**: Best for photos, supports quality settings
- **PNG**: Best for images with transparency, supports compression levels
- **WebP**: Modern format with excellent compression and quality
- **AVIF**: Next-generation format with superior compression

## Compression Presets

- `web`: Optimized for web delivery (WebP, 80% quality)
- `thumbnail`: Small thumbnails (300x300, WebP, 70% quality)
- `highQuality`: High quality output (JPEG, 95% quality)
- `lowFileSize`: Minimal file size (WebP, 60% quality)

## Error Handling

The package gracefully handles various error conditions:

```typescript
const result = await compressImageServer('input.jpg');

if (!result.success) {
    console.error('Compression failed:', result.error);

    // Common error cases:
    // - "Skipping ICO file - format not supported for compression"
    // - "Skipping SVG format - not supported for compression"
    // - File not found, permission errors, corrupted files, etc.
}
```

## License

Apache-2.0
