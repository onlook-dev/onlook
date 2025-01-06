import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { addStandaloneConfig } from '../src/frameworks/next';

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

            // Apply the standalone config modification
            addStandaloneConfig(process.cwd());

            // Wait a bit for the file operation to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Read the modified config
            const modifiedConfig = fs.readFileSync(configPath, 'utf8');

            // Verify the output configuration was added
            expect(modifiedConfig).toContain('output: "standalone"');
            expect(modifiedConfig).toContain('reactStrictMode: true');

            // Clean up this config file
            fs.unlinkSync(configPath);
        }
    });

    test('addStandaloneConfig does not duplicate output property', async () => {
        const configPath = path.resolve(process.cwd(), 'next.config.js');

        // Create config with existing output property using CommonJS syntax
        const configWithOutput = `
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: "standalone"
};

module.exports = nextConfig;
        `.trim();

        fs.writeFileSync(configPath, configWithOutput, 'utf8');

        // Apply the standalone config modification
        addStandaloneConfig(process.cwd());

        // Wait a bit for the file operation to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Read the modified config
        const modifiedConfig = fs.readFileSync(configPath, 'utf8');

        // Count occurrences of 'output'
        const outputCount = (modifiedConfig.match(/output:/g) || []).length;

        // Verify there's only one output property
        expect(outputCount).toBe(1);
        expect(modifiedConfig).toContain('output: "standalone"');
    });
});
