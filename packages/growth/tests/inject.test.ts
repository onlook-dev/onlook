import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
    addBuiltWithScript,
    injectBuiltWithScript,
    removeBuiltWithScript,
    removeBuiltWithScriptFromLayout,
} from '../src';

describe('Built with Onlook Script', () => {
    const tempDir = path.join(process.cwd(), 'temp-test-project');
    const appDir = path.join(tempDir, 'app');
    const publicDir = path.join(tempDir, 'public');
    const layoutPath = path.join(appDir, 'layout.tsx');
    const scriptPath = path.join(publicDir, 'builtwith.js');

    // Set up a temporary Next.js project structure
    beforeEach(() => {
        // Create directories
        fs.mkdirSync(tempDir, { recursive: true });
        fs.mkdirSync(appDir, { recursive: true });
        fs.mkdirSync(publicDir, { recursive: true });

        // Create a basic layout.tsx file
        const layoutContent = `export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
        <body className={inter.className}>
            {children}
        </body>
    </html>
    );
}`;
        fs.writeFileSync(layoutPath, layoutContent, 'utf8');
    });

    // Clean up after each test
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('injectBuiltWithScript adds Script component to layout.tsx', async () => {
        // Inject the script
        const result = await injectBuiltWithScript(tempDir);
        expect(result).toBe(true);

        // Read the modified layout file
        const layoutContent = fs.readFileSync(layoutPath, 'utf8');

        // Verify Script import was added
        expect(layoutContent).toContain('import Script from "next/script";');

        // Verify Script component was added
        expect(layoutContent).toContain(
            '<Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />',
        );
    });

    test('addBuiltWithScript copies script to public folder', async () => {
        // Add the script
        const result = await addBuiltWithScript(tempDir);
        expect(result).toBe(true);

        // Verify the script file exists
        expect(fs.existsSync(scriptPath)).toBe(true);

        // Verify the content of the script
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        expect(scriptContent).toContain('class BuiltWithOnlook extends HTMLElement');
    });

    test('removeBuiltWithScriptFromLayout removes Script component from layout.tsx', async () => {
        // First inject the script
        await injectBuiltWithScript(tempDir);

        // Then remove it
        const result = await removeBuiltWithScriptFromLayout(tempDir);
        expect(result).toBe(true);

        // Read the modified layout file
        const layoutContent = fs.readFileSync(layoutPath, 'utf8');

        // Verify Script import was removed
        expect(layoutContent).not.toContain('import Script from "next/script";');

        // Verify Script component was removed
        expect(layoutContent).not.toContain(
            '<Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />',
        );
    });

    test('removeBuiltWithScript removes script from public folder', async () => {
        // First add the script
        await addBuiltWithScript(tempDir);

        // Then remove it
        const result = await removeBuiltWithScript(tempDir);
        expect(result).toBe(true);

        // Verify the script file no longer exists
        expect(fs.existsSync(scriptPath)).toBe(false);
    });

    test('injectBuiltWithScript handles missing layout file', async () => {
        // Remove the layout file
        fs.unlinkSync(layoutPath);

        // Try to inject the script
        const result = await injectBuiltWithScript(tempDir);
        expect(result).toBe(false);
    });

    test('removeBuiltWithScript handles missing script file', async () => {
        // Try to remove a non-existent script
        const result = await removeBuiltWithScript(tempDir);
        expect(result).toBe(false);
    });

    test('removeBuiltWithScriptFromLayout handles missing layout file', async () => {
        // Remove the layout file
        fs.unlinkSync(layoutPath);

        // Try to remove the script from layout
        const result = await removeBuiltWithScriptFromLayout(tempDir);
        expect(result).toBe(false);
    });

    test('full workflow: inject, add, remove from layout, remove script', async () => {
        // Inject the script into layout
        const injectResult = await injectBuiltWithScript(tempDir);
        expect(injectResult).toBe(true);

        // Add the script to public folder
        const addResult = await addBuiltWithScript(tempDir);
        expect(addResult).toBe(true);

        // Verify both operations were successful
        expect(fs.existsSync(scriptPath)).toBe(true);
        let layoutContent = fs.readFileSync(layoutPath, 'utf8');
        expect(layoutContent).toContain(
            '<Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />',
        );

        // Remove the script from layout
        const removeLayoutResult = await removeBuiltWithScriptFromLayout(tempDir);
        expect(removeLayoutResult).toBe(true);

        // Remove the script from public folder
        const removeScriptResult = await removeBuiltWithScript(tempDir);
        expect(removeScriptResult).toBe(true);

        // Verify both removal operations were successful
        expect(fs.existsSync(scriptPath)).toBe(false);
        layoutContent = fs.readFileSync(layoutPath, 'utf8');
        expect(layoutContent).not.toContain(
            '<Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />',
        );
    });
});
