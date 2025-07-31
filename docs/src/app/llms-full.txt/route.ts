import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// Enable ISR (Incremental Static Regeneration) with 1-hour revalidation
export const revalidate = 3600;

interface DocFile {
    path: string;
    title: string;
    content: string;
}

async function scanDocsDirectory(dirPath: string, basePath: string = ''): Promise<DocFile[]> {
    const files: DocFile[] = [];

    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            const relativePath = join(basePath, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await scanDocsDirectory(fullPath, relativePath);
                files.push(...subFiles);
            } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
                try {
                    const content = await readFile(fullPath, 'utf-8');
                    const title = extractTitle(content, entry.name);

                    files.push({
                        path: relativePath,
                        title,
                        content: cleanMarkdownContent(content),
                    });
                } catch (error) {
                    console.warn(`Failed to read file ${fullPath}:`, error);
                }
            }
        }
    } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
    }

    return files;
}

function extractTitle(content: string, filename: string): string {
    // Try to extract title from frontmatter or first heading
    const titleMatch =
        content.match(/^title:\s*["']?([^"'\n]+)["']?/m) || content.match(/^#\s+(.+)$/m);

    if (titleMatch) {
        return titleMatch[1].trim();
    }

    // Fallback to filename without extension
    return filename.replace(/\.(mdx?|md)$/, '').replace(/-/g, ' ');
}

function cleanMarkdownContent(content: string): string {
    // Remove frontmatter
    content = content.replace(/^---[\s\S]*?---\n/, '');

    // Remove JSX components and imports
    content = content.replace(/^import\s+.*$/gm, '');
    content = content.replace(/<[^>]+>/g, '');

    // Clean up extra whitespace
    content = content.replace(/\n{3,}/g, '\n\n');

    return content.trim();
}

async function getFullDocumentation(baseUrl: string, webUrl?: string): Promise<string> {
    const docsPath = join(process.cwd(), 'content', 'docs');
    const docFiles = await scanDocsDirectory(docsPath);

    let fullContent = `# Onlook Documentation - Complete Reference

> Comprehensive documentation for Onlook - the open-source visual editor for React apps. Design directly in your live React app and generate clean code.

## Table of Contents

`;

    // Generate table of contents
    for (const file of docFiles) {
        const anchor = file.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        fullContent += `- [${file.title}](#${anchor})\n`;
    }

    fullContent += '\n---\n\n';

    // Add all documentation content
    for (const file of docFiles) {
        const anchor = file.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        fullContent += `## ${file.title} {#${anchor}}\n\n`;
        fullContent += `*Source: ${file.path}*\n\n`;
        fullContent += file.content;
        fullContent += '\n\n---\n\n';
    }

    // Add additional project information
    fullContent += `## Project Information

### Repository Structure

Onlook is structured as a monorepo with the following key directories:

- **apps/web/**: Main web application (Next.js)
- **docs/**: Documentation site (Next.js with Fumadocs)
- **packages/**: Shared packages and utilities
  - **ai/**: AI integration and chat functionality
  - **ui/**: Reusable UI components
  - **models/**: Data models and types
  - **parser/**: Code parsing and manipulation
  - **db/**: Database schema and utilities

### Technology Stack

- **Frontend**: Next.js, React, TailwindCSS, TypeScript
- **Backend**: Supabase, tRPC, Drizzle ORM
- **AI**: Anthropic Claude, OpenRouter integration
- **Development**: Bun, Docker, CodeSandbox containers
- **Deployment**: Vercel

### Key Features

- Visual editing of React components in the browser
- Real-time code generation and export
- TailwindCSS integration with visual style editor
- AI-powered design assistance
- Component library and design system support
- Collaborative editing capabilities

### Community

- **GitHub**: https://github.com/onlook-dev/onlook
- **Discord**: https://discord.gg/hERDfFZCsH
- **Website**: ${webUrl || baseUrl.replace('docs.', '')}
- **Documentation**: ${baseUrl}

---

*This documentation was automatically generated from the Onlook documentation source files.*
`;

    return fullContent;
}

export async function GET() {
    const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';
    const webUrl = process.env.APP_URL ?? 'https://onlook.com';

    try {
        const content = await getFullDocumentation(docsUrl, webUrl);

        return new Response(content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Robots-Tag': 'llms-txt',
            },
        });
    } catch (error) {
        console.error('Error generating llms-full.txt:', error);

        // Fallback content if file reading fails
        const fallbackContent = `# Onlook Documentation - Complete Reference

> Comprehensive documentation for Onlook - the open-source visual editor for React apps.

## Error

Unable to generate complete documentation. Please visit ${docsUrl} for the latest documentation.

## Basic Information

Onlook is an open-source visual editor for React applications that allows designers to make live edits directly in the browser and generate clean code.

### Key Features
- Visual editing of React components
- TailwindCSS integration
- AI-powered assistance
- Real-time code generation
- Component library support

### Links
- Documentation: ${docsUrl}
- GitHub: https://github.com/onlook-dev/onlook
- Discord: https://discord.gg/hERDfFZCsH
`;

        return new Response(fallbackContent, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Robots-Tag': 'llms-txt',
            },
        });
    }
}
