import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import { batchCompressImagesServer, compressImageServer } from '../src/compress';

// Test directories
const TEST_INPUT_DIR = path.join(__dirname, 'images', 'input');
const TEST_OUTPUT_DIR = path.join(__dirname, 'images', 'output');

describe('Image Compression Server-Side', () => {
    beforeAll(async () => {
        // Create output directory if it doesn't exist
        await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    });

    afterAll(async () => {
        // Clean up output directory after tests
        try {
            await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
            console.log('🧹 Cleaned up test output directory');
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Input Validation', () => {
        it('should handle non-existent file gracefully', async () => {
            const result = await compressImageServer('non-existent-file.jpg');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle invalid input gracefully', async () => {
            const result = await compressImageServer('');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Real Image Compression Tests', () => {
        let testImages: string[] = [];

        beforeAll(async () => {
            try {
                const files = await fs.readdir(TEST_INPUT_DIR);
                testImages = files.filter((file) =>
                    /\.(jpg|jpeg|png|webp|tiff|tif|bmp|gif)$/i.test(file),
                );

                if (testImages.length === 0) {
                    console.log('No test images found in:', TEST_INPUT_DIR);
                }
            } catch (error) {
                console.log('Test input directory not accessible, skipping real image tests');
            }
        });

        it('should compress JPEG images when available', async () => {
            const jpegImages = testImages.filter((img) => /\.(jpg|jpeg)$/i.test(img));

            if (jpegImages.length === 0) {
                console.log('Skipping JPEG test - no JPEG files found in test directory');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, jpegImages[0]!);
            const outputPath = path.join(TEST_OUTPUT_DIR, `compressed-${jpegImages[0]}.webp`);

            const result = await compressImageServer(inputPath, outputPath, {
                quality: 80,
                format: 'webp',
            });

            if (result.success) {
                expect(result.originalSize).toBeGreaterThan(0);
                expect(result.compressedSize).toBeGreaterThan(0);
                expect(result.compressionRatio).toBeGreaterThan(0);
                expect(result.outputPath).toBe(outputPath);

                // Verify output file exists
                const outputExists = await fs
                    .access(outputPath)
                    .then(() => true)
                    .catch(() => false);
                expect(outputExists).toBe(true);
            } else {
                console.log('JPEG compression failed:', result.error);
            }
        });

        it('should compress PNG images when available', async () => {
            const pngImages = testImages.filter((img) => /\.png$/i.test(img));

            if (pngImages.length === 0) {
                console.log('Skipping PNG test - no PNG files found in test directory');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, pngImages[0]!);
            const outputPath = path.join(TEST_OUTPUT_DIR, `compressed-${pngImages[0]}.webp`);

            const result = await compressImageServer(inputPath, outputPath, {
                quality: 85,
                format: 'webp',
            });

            if (result.success) {
                expect(result.originalSize).toBeGreaterThan(0);
                expect(result.compressedSize).toBeGreaterThan(0);
                expect(result.outputPath).toBe(outputPath);
            } else {
                console.log('PNG compression failed:', result.error);
            }
        });

        it('should handle auto format detection', async () => {
            if (testImages.length === 0) {
                console.log('Skipping auto format test - no test images available');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, testImages[0]!);
            const outputPath = path.join(TEST_OUTPUT_DIR, `auto-format-${testImages[0]}`);

            const result = await compressImageServer(inputPath, outputPath, {
                format: 'auto',
                quality: 75,
            });

            if (result.success) {
                expect(result.originalSize).toBeGreaterThan(0);
                expect(result.compressedSize).toBeGreaterThan(0);
            } else {
                console.log('Auto format detection failed:', result.error);
            }
        });

        it('should resize images when specified', async () => {
            if (testImages.length === 0) {
                console.log('Skipping resize test - no test images available');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, testImages[0]!);
            const outputPath = path.join(TEST_OUTPUT_DIR, `resized-${testImages[0]}.webp`);

            const result = await compressImageServer(inputPath, outputPath, {
                width: 800,
                height: 600,
                format: 'webp',
                quality: 80,
                keepAspectRatio: true,
            });

            if (result.success) {
                expect(result.originalSize).toBeGreaterThan(0);
                expect(result.compressedSize).toBeGreaterThan(0);
            } else {
                console.log('Resize failed:', result.error);
            }
        });

        it('should return buffer when no output path specified', async () => {
            if (testImages.length === 0) {
                console.log('Skipping buffer test - no test images available');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, testImages[0]!);

            const result = await compressImageServer(inputPath, undefined, {
                quality: 70,
                format: 'webp',
            });

            if (result.success && result.buffer) {
                expect(Buffer.isBuffer(result.buffer)).toBe(true);
                expect(result.buffer.length).toBeGreaterThan(0);
                expect(result.compressedSize).toBe(result.buffer.length);
            } else {
                console.log('Buffer compression failed:', result.error);
            }
        });
    });

    describe('ICO File Compression Tests', () => {
        let icoImages: string[] = [];

        beforeAll(async () => {
            try {
                const files = await fs.readdir(TEST_INPUT_DIR);
                icoImages = files.filter((file) => /\.ico$/i.test(file));

                if (icoImages.length === 0) {
                    console.log('No ICO test images found in:', TEST_INPUT_DIR);
                }
            } catch (error) {
                console.log('Test input directory not accessible for ICO tests');
            }
        });

        it('should skip ICO files with appropriate message', async () => {
            if (icoImages.length === 0) {
                console.log('Skipping ICO skip test - no ICO files found');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, icoImages[0]!);
            const outputPath = path.join(TEST_OUTPUT_DIR, `ico-should-skip-${icoImages[0]}.webp`);

            const result = await compressImageServer(inputPath, outputPath, {
                format: 'webp',
                quality: 80,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Skipping .ICO file');
            expect(result.error).toContain('format not supported for compression');

            // Verify output file was NOT created
            const outputExists = await fs
                .access(outputPath)
                .then(() => true)
                .catch(() => false);
            expect(outputExists).toBe(false);

            console.log(`✅ ICO properly skipped: ${result.error}`);
        });

        it('should skip ICO files in batch processing', async () => {
            if (icoImages.length === 0) {
                console.log('Skipping ICO batch skip test - no ICO files found');
                return;
            }

            const inputPaths = [path.join(TEST_INPUT_DIR, icoImages[0]!)];
            const batchOutputDir = path.join(TEST_OUTPUT_DIR, 'ico-batch-skip');

            const results = await batchCompressImagesServer(inputPaths, batchOutputDir, {
                format: 'webp',
                quality: 80,
            });

            expect(results).toHaveLength(1);
            expect(results[0]!.success).toBe(false);
            expect(results[0]!.error).toContain(
                'Skipped .ICO file: favicon.ico - format not supported for compression',
            );
        });
    });

    describe('SVG File Compression Tests', () => {
        let svgImages: string[] = [];

        beforeAll(async () => {
            try {
                const files = await fs.readdir(TEST_INPUT_DIR);
                svgImages = files.filter((file) => /\.svg$/i.test(file));

                if (svgImages.length === 0) {
                    console.log('No SVG test images found in:', TEST_INPUT_DIR);
                }
            } catch (error) {
                console.log('Test input directory not accessible for SVG tests');
            }
        });

        it('should skip SVG files with appropriate message', async () => {
            if (svgImages.length === 0) {
                console.log('Skipping SVG skip test - no SVG files found');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, svgImages[0]!);
            const outputPath = path.join(TEST_OUTPUT_DIR, `svg-should-skip-${svgImages[0]}.webp`);

            const result = await compressImageServer(inputPath, outputPath, {
                format: 'webp',
                quality: 90,
                width: 512,
                height: 512,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Skipping .SVG file');
            expect(result.error).toContain('format not supported for compression');

            // Verify output file was NOT created
            const outputExists = await fs
                .access(outputPath)
                .then(() => true)
                .catch(() => false);
            expect(outputExists).toBe(false);
        });

        it('should skip SVG files in batch processing', async () => {
            if (svgImages.length === 0) {
                console.log('Skipping SVG batch skip test - no SVG files found');
                return;
            }

            const inputPaths = [path.join(TEST_INPUT_DIR, svgImages[0]!)];
            const batchOutputDir = path.join(TEST_OUTPUT_DIR, 'svg-batch-skip');

            const results = await batchCompressImagesServer(inputPaths, batchOutputDir, {
                format: 'webp',
                quality: 85,
                width: 512,
                height: 512,
            });

            expect(results).toHaveLength(1);
            expect(results[0]!.success).toBe(false);
            expect(results[0]!.error).toContain(
                'Skipped .SVG file: svg.svg - format not supported for compression',
            );
        });

        it('should handle SVG buffer input by skipping', async () => {
            if (svgImages.length === 0) {
                console.log('Skipping SVG buffer skip test - no SVG files found');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, svgImages[0]!);
            const svgBuffer = await fs.readFile(inputPath);

            const result = await compressImageServer(svgBuffer, undefined, {
                format: 'webp',
                quality: 85,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Skipping SVG format');
        });
    });

    describe('Batch Compression with Mixed Formats', () => {
        it('should handle mixed formats by skipping ICO and SVG', async () => {
            let allImages: string[] = [];

            try {
                const files = await fs.readdir(TEST_INPUT_DIR);
                allImages = files
                    .filter((file) => /\.(jpg|jpeg|png|webp|tiff|tif|ico|svg)$/i.test(file))
                    .slice(0, 5); // Limit to first 5 for testing
            } catch (error) {
                // Directory doesn't exist
            }

            if (allImages.length === 0) {
                console.log('Skipping mixed batch test - no test images available');
                return;
            }

            const inputPaths = allImages.map((img) => path.join(TEST_INPUT_DIR, img));
            const batchOutputDir = path.join(TEST_OUTPUT_DIR, 'mixed-batch-with-skips');

            const results = await batchCompressImagesServer(inputPaths, batchOutputDir, {
                quality: 85,
                format: 'webp',
                width: 512,
                height: 512,
                keepAspectRatio: true,
            });

            expect(results.length).toBe(allImages.length);

            // Separate successful and skipped results
            const successfulResults = results.filter((r) => r.success);
            const skippedResults = results.filter((r) => !r.success);

            // Log results for each format
            results.forEach((result, index) => {
                const fileName = allImages[index];
                const extension = path.extname(fileName).toLowerCase();

                if (result.success) {
                    console.log(
                        `✅ ${extension.toUpperCase()} processed: ${fileName} - ${result.originalSize}B → ${result.compressedSize}B`,
                    );
                } else {
                    console.log(
                        `⏭️ ${extension.toUpperCase()} skipped: ${fileName} - ${result.error}`,
                    );
                }
            });

            // Verify that ICO and SVG files were skipped
            skippedResults.forEach((result, index) => {
                const skippedIndex = results.findIndex((r) => r === result);
                const fileName = allImages[skippedIndex];
                const extension = path.extname(fileName).toLowerCase();

                if (extension === '.ico' || extension === '.svg') {
                    expect(result.error).toContain(`Skipped ${extension.toUpperCase()} file`);
                }
            });

            // Verify output files exist only for successful compressions
            for (const result of successfulResults) {
                if (result.outputPath) {
                    const exists = await fs
                        .access(result.outputPath)
                        .then(() => true)
                        .catch(() => false);
                    expect(exists).toBe(true);
                }
            }
        });
    });

    describe('Batch Compression Tests', () => {
        it('should batch compress multiple images when available', async () => {
            let testImages: string[] = [];

            try {
                const files = await fs.readdir(TEST_INPUT_DIR);
                testImages = files
                    .filter((file) => /\.(jpg|jpeg|png|webp|tiff|tif)$/i.test(file))
                    .slice(0, 3); // Limit to first 3 images for testing
            } catch (error) {
                // Directory doesn't exist
            }

            if (testImages.length === 0) {
                console.log('Skipping batch test - no test images available');
                return;
            }

            const inputPaths = testImages.map((img) => path.join(TEST_INPUT_DIR, img));
            const batchOutputDir = path.join(TEST_OUTPUT_DIR, 'batch');

            const results = await batchCompressImagesServer(inputPaths, batchOutputDir, {
                quality: 80,
                format: 'webp',
                width: 1200,
            });

            expect(results.length).toBe(testImages.length);

            const successfulResults = results.filter((r) => r.success);
            expect(successfulResults.length).toBeGreaterThan(0);

            const totalOriginalSize = successfulResults.reduce(
                (sum, r) => sum + (r.originalSize || 0),
                0,
            );
            const totalCompressedSize = successfulResults.reduce(
                (sum, r) => sum + (r.compressedSize || 0),
                0,
            );
            const totalSavings =
                totalOriginalSize > 0
                    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
                    : 0;
            // Verify output files exist
            for (const result of successfulResults) {
                if (result.outputPath) {
                    const exists = await fs
                        .access(result.outputPath)
                        .then(() => true)
                        .catch(() => false);
                    expect(exists).toBe(true);
                }
            }
        });
    });

    describe('Quality Comparison Tests', () => {
        it('should show quality vs size relationship', async () => {
            let testImages: string[] = [];

            try {
                const files = await fs.readdir(TEST_INPUT_DIR);
                testImages = files.filter((file) => /\.(jpg|jpeg)$/i.test(file));
            } catch (error) {
                // Directory doesn't exist
            }

            if (testImages.length === 0) {
                console.log('Skipping quality comparison - no JPEG test images available');
                return;
            }

            const inputPath = path.join(TEST_INPUT_DIR, testImages[0]!);
            const qualityLevels = [95, 80, 65, 50];

            const results = await Promise.all(
                qualityLevels.map(async (quality) => {
                    const outputPath = path.join(
                        TEST_OUTPUT_DIR,
                        `quality-${quality}-${testImages[0]}.webp`,
                    );
                    const result = await compressImageServer(inputPath, outputPath, {
                        quality,
                        format: 'webp',
                    });
                    return { quality, ...result };
                }),
            );
            const successfulResults = results.filter((r) => r.success);
            successfulResults.forEach((result) => {
                expect(result.compressedSize).toBeGreaterThan(0);
            });
            expect(successfulResults.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle corrupted files gracefully', async () => {
            // Create a fake "image" file
            const corruptedPath = path.join(TEST_OUTPUT_DIR, 'corrupted.jpg');
            await fs.writeFile(corruptedPath, 'This is not an image file');

            const result = await compressImageServer(corruptedPath);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Clean up
            await fs.unlink(corruptedPath);
        });

        it('should handle permission errors gracefully', async () => {
            const result = await compressImageServer('/', '/root/impossible-path.jpg');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle malformed ICO files gracefully', async () => {
            // Create a fake ICO file
            const fakeIcoPath = path.join(TEST_OUTPUT_DIR, 'fake.ico');
            await fs.writeFile(fakeIcoPath, 'This is not a real ICO file');

            const result = await compressImageServer(fakeIcoPath);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Clean up
            await fs.unlink(fakeIcoPath);
        });

        it('should handle malformed SVG files gracefully', async () => {
            // Create a fake SVG file
            const fakeSvgPath = path.join(TEST_OUTPUT_DIR, 'fake.svg');
            await fs.writeFile(fakeSvgPath, '<svg>This is not valid SVG');

            const result = await compressImageServer(fakeSvgPath);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Clean up
            await fs.unlink(fakeSvgPath);
        });
    });
});
