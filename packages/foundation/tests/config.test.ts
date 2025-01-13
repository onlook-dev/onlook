import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { addNextBuildConfig } from '../src/frameworks/next';

describe('Next.js Config Modifications', () => {
    const configFiles = ['next.config.js', 'next.config.ts', 'next.config.mjs'];

    // Clean up all possible config files after each test
    afterEach(() => {
        configFiles.forEach((file) => {
            const filePath = path.resolve(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    });

    test('addStandaloneConfig works with different config file types', async () => {
        // Test each config file type
        for (const configFile of configFiles) {
            const configPath = path.resolve(process.cwd(), configFile);

            // Create a basic config file using CommonJS syntax
            const initialConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true
};

module.exports = nextConfig;
            `.trim();

            fs.writeFileSync(configPath, initialConfig, 'utf8');

            // Apply the config modifications
            addNextBuildConfig(process.cwd());

            // Wait a bit for the file operation to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Read the modified config
            const modifiedConfig = fs.readFileSync(configPath, 'utf8');

            // Verify both configurations were added
            expect(modifiedConfig).toContain('output: "standalone"');
            expect(modifiedConfig).toContain('typescript: {');
            expect(modifiedConfig).toContain('ignoreBuildErrors: true');
            expect(modifiedConfig).toContain('reactStrictMode: true');

            // Clean up this config file
            fs.unlinkSync(configPath);
        }
    });

    test('addStandaloneConfig does not duplicate properties', async () => {
        const configPath = path.resolve(process.cwd(), 'next.config.js');

        // Create config with existing properties using CommonJS syntax
        const configWithExisting = `
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: "standalone",
    typescript: {
        ignoreBuildErrors: true
    }
};

module.exports = nextConfig;
        `.trim();

        fs.writeFileSync(configPath, configWithExisting, 'utf8');

        // Apply the config modifications
        addNextBuildConfig(process.cwd());

        // Wait a bit for the file operation to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Read the modified config
        const modifiedConfig = fs.readFileSync(configPath, 'utf8');

        // Count occurrences of properties
        const outputCount = (modifiedConfig.match(/output:/g) || []).length;
        const typescriptCount = (modifiedConfig.match(/typescript:/g) || []).length;

        // Verify there's only one instance of each property
        expect(outputCount).toBe(1);
        expect(typescriptCount).toBe(1);
        expect(modifiedConfig).toContain('output: "standalone"');
        expect(modifiedConfig).toContain('typescript: {');
        expect(modifiedConfig).toContain('ignoreBuildErrors: true');
    });

    test('addStandaloneConfig preserves existing typescript attributes', async () => {
        const configPath = path.resolve(process.cwd(), 'next.config.js');

        // Create config with existing typescript properties
        const configWithExisting = `
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
        tsconfigPath: "./custom-tsconfig.json",
        ignoreBuildErrors: false
    }
};

module.exports = nextConfig;
        `.trim();

        fs.writeFileSync(configPath, configWithExisting, 'utf8');

        // Apply the config modifications
        addNextBuildConfig(process.cwd());

        // Wait a bit for the file operation to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Read the modified config
        const modifiedConfig = fs.readFileSync(configPath, 'utf8');

        // Verify typescript configuration
        expect(modifiedConfig).toContain('typescript: {');
        expect(modifiedConfig).toContain('ignoreBuildErrors: true'); // Should be updated to true
        expect(modifiedConfig).toContain('tsconfigPath: "./custom-tsconfig.json"'); // Should be preserved
        expect((modifiedConfig.match(/typescript:/g) || []).length).toBe(1); // Should still only have one typescript block
    });
});
