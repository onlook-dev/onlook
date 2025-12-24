import { FileOperations } from '@onlook/utility';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
    addBuiltWithScript,
    injectBuiltWithScript,
    removeBuiltWithScript,
    removeBuiltWithScriptFromLayout,
} from '../src';

const fileOps: FileOperations = {
    readFile: async (filePath: string) => {
        return fs.readFileSync(filePath, 'utf8');
    },
    writeFile: async (filePath: string, content: string) => {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    },
    fileExists: async (filePath: string) => {
        return fs.existsSync(filePath);
    },
    delete: async (filePath: string) => {
        fs.unlinkSync(filePath);
        return true;
    },
    copy: async (source: string, destination: string) => {
        fs.copyFileSync(source, destination);
        return true;
    },
};

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
        const result = await injectBuiltWithScript(tempDir, fileOps);
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
        const result = await addBuiltWithScript(tempDir, fileOps);
        expect(result).toBe(true);

        // Verify the script file exists
        expect(fs.existsSync(scriptPath)).toBe(true);

        // Verify the content of the script
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        expect(scriptContent).toContain('class BuiltWithOnlook extends HTMLElement');
    });

    test('removeBuiltWithScriptFromLayout removes Script component from layout.tsx', async () => {
        // First inject the script
        await injectBuiltWithScript(tempDir, fileOps);

        // Then remove it
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
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
        await addBuiltWithScript(tempDir, fileOps);

        // Then remove it
        const result = await removeBuiltWithScript(tempDir, fileOps);
        expect(result).toBe(true);

        // Verify the script file no longer exists
        expect(fs.existsSync(scriptPath)).toBe(false);
    });

    test('removeBuiltWithScriptFromLayout works with src/app directory structure', async () => {
        // Remove the original app/layout.tsx
        fs.unlinkSync(layoutPath);

        // Create src/app directory structure
        const srcAppDir = path.join(tempDir, 'src', 'app');
        const srcLayoutPath = path.join(srcAppDir, 'layout.tsx');

        fs.mkdirSync(srcAppDir, { recursive: true });

        // Create a layout.tsx file with Script already injected
        const layoutWithScript = `import Script from "next/script";

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
        <body className={inter.className}>
            {children}
            <Script src="/builtwith.js" strategy="afterInteractive" />
        </body>
    </html>
    );
}`;
        fs.writeFileSync(srcLayoutPath, layoutWithScript, 'utf8');

        // Remove the script from layout
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(result).toBe(true);

        // Read the modified layout file
        const modifiedLayoutContent = fs.readFileSync(srcLayoutPath, 'utf8');

        // Verify Script component was removed
        expect(modifiedLayoutContent).not.toContain(
            '<Script src="/builtwith.js" strategy="afterInteractive" />',
        );

        // Verify Script import was removed
        expect(modifiedLayoutContent).not.toContain('import Script from "next/script";');
    });

    test('injectBuiltWithScript handles missing layout file', async () => {
        // Remove the layout file
        fs.unlinkSync(layoutPath);

        // Try to inject the script
        const result = await injectBuiltWithScript(tempDir, fileOps);
        expect(result).toBe(false);
    });

    test('injectBuiltWithScript works with src/app directory structure', async () => {
        // Remove the original app/layout.tsx
        fs.unlinkSync(layoutPath);

        // Create src/app directory structure
        const srcAppDir = path.join(tempDir, 'src', 'app');
        const srcLayoutPath = path.join(srcAppDir, 'layout.tsx');

        fs.mkdirSync(srcAppDir, { recursive: true });

        // Create a basic layout.tsx file in src/app
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
        fs.writeFileSync(srcLayoutPath, layoutContent, 'utf8');

        // Inject the script
        const result = await injectBuiltWithScript(tempDir, fileOps);
        expect(result).toBe(true);

        // Read the modified layout file
        const modifiedLayoutContent = fs.readFileSync(srcLayoutPath, 'utf8');

        // Verify Script import was added
        expect(modifiedLayoutContent).toContain('import Script from "next/script";');

        // Verify Script component was added
        expect(modifiedLayoutContent).toContain(
            '<Script src="/builtwith.js" strategy="afterInteractive" />',
        );
    });

    test('removeBuiltWithScript handles missing script file', async () => {
        // Try to remove a non-existent script
        const result = await removeBuiltWithScript(tempDir, fileOps);
        expect(result).toBe(false);
    });

    test('removeBuiltWithScriptFromLayout handles missing layout file', async () => {
        // Remove the layout file
        fs.unlinkSync(layoutPath);

        // Try to remove the script from layout
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(result).toBe(false);
    });

    test('full workflow: inject, add, remove from layout, remove script', async () => {
        // Inject the script into layout
        const injectResult = await injectBuiltWithScript(tempDir, fileOps);
        expect(injectResult).toBe(true);

        // Add the script to public folder
        const addResult = await addBuiltWithScript(tempDir, fileOps);
        expect(addResult).toBe(true);

        // Verify both operations were successful
        expect(fs.existsSync(scriptPath)).toBe(true);
        let layoutContent = fs.readFileSync(layoutPath, 'utf8');
        expect(layoutContent).toContain(
            '<Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />',
        );

        // Remove the script from layout
        const removeLayoutResult = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(removeLayoutResult).toBe(true);

        // Remove the script from public folder
        const removeScriptResult = await removeBuiltWithScript(tempDir, fileOps);
        expect(removeScriptResult).toBe(true);

        // Verify both removal operations were successful
        expect(fs.existsSync(scriptPath)).toBe(false);
        layoutContent = fs.readFileSync(layoutPath, 'utf8');
        expect(layoutContent).not.toContain(
            '<Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />',
        );
    });

    test('removeBuiltWithScriptFromLayout does not remove Script import if other Script elements exist', async () => {
        // Write a layout file with two Script elements: one for builtwith.js and one for something else
        const layoutContent = `import Script from "next/script";
export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
        <body className={inter.className}>
            <Script src="/builtwith.js" strategy="afterInteractive" />
            <Script src="/analytics.js" strategy="afterInteractive" />
            {children}
        </body>
    </html>
    );
}`;
        fs.writeFileSync(layoutPath, layoutContent, 'utf8');

        // Remove the builtwith.js script
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(result).toBe(true);

        // Read the modified layout file
        const modifiedContent = fs.readFileSync(layoutPath, 'utf8');

        // The builtwith.js Script should be removed
        expect(modifiedContent).not.toContain(
            '<Script src="/builtwith.js" strategy="afterInteractive" />',
        );
        // The analytics.js Script should remain
        expect(modifiedContent).toContain(
            '<Script src="/analytics.js" strategy="afterInteractive" />',
        );
        // The Script import should still be present
        expect(modifiedContent).toContain('import Script from "next/script";');
    });

    test('removeBuiltWithScriptFromLayout does not remove Script import if Script is in head', async () => {
        const layoutContent = `import Script from "next/script";
export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
        <head>
            <Script src=\"/analytics.js\" strategy=\"afterInteractive\" />
        </head>
        <body className={inter.className}>
            <Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />
            {children}
        </body>
    </html>
    );
}`;
        fs.writeFileSync(layoutPath, layoutContent, 'utf8');
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(result).toBe(true);
        const modifiedContent = fs.readFileSync(layoutPath, 'utf8');
        expect(modifiedContent).not.toContain(
            '<Script src="/builtwith.js" strategy="afterInteractive" />',
        );
        expect(modifiedContent).toContain(
            '<Script src="/analytics.js" strategy="afterInteractive" />',
        );
        expect(modifiedContent).toContain('import Script from "next/script";');
    });

    test('removeBuiltWithScriptFromLayout does not remove Script import if Script is a sibling to html', async () => {
        const layoutContent = `import Script from \"next/script\";
export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <Script src=\"/analytics.js\" strategy=\"afterInteractive\" />
            <html lang=\"en\">
                <body className={inter.className}>
                    <Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />
                    {children}
                </body>
            </html>
        </>
    );
}`;
        fs.writeFileSync(layoutPath, layoutContent, 'utf8');
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(result).toBe(true);
        const modifiedContent = fs.readFileSync(layoutPath, 'utf8');
        expect(modifiedContent).not.toContain(
            '<Script src="/builtwith.js" strategy="afterInteractive" />',
        );
        expect(modifiedContent).toContain(
            '<Script src="/analytics.js" strategy="afterInteractive" />',
        );
        expect(modifiedContent).toContain('import Script from "next/script";');
    });

    test('removeBuiltWithScriptFromLayout does not remove Script import if Script is in a fragment', async () => {
        const layoutContent = `import Script from \"next/script\";
export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <html lang=\"en\">
                <body className={inter.className}>
                    <Script src=\"/builtwith.js\" strategy=\"afterInteractive\" />
                    {children}
                </body>
            </html>
            <Script src=\"/analytics.js\" strategy=\"afterInteractive\" />
        </>
    );
}`;
        fs.writeFileSync(layoutPath, layoutContent, 'utf8');
        const result = await removeBuiltWithScriptFromLayout(tempDir, fileOps);
        expect(result).toBe(true);
        const modifiedContent = fs.readFileSync(layoutPath, 'utf8');
        expect(modifiedContent).not.toContain(
            '<Script src="/builtwith.js" strategy="afterInteractive" />',
        );
        expect(modifiedContent).toContain(
            '<Script src="/analytics.js" strategy="afterInteractive" />',
        );
        expect(modifiedContent).toContain('import Script from "next/script";');
    });
});
