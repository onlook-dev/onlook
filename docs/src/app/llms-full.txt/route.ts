export function GET() {
    const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';
    const webUrl = process.env.APP_URL ?? 'https://onlook.com';
    
    const content = `# Onlook Documentation - Complete Reference

> Comprehensive documentation for Onlook - the open-source visual editor for React apps.

## Project Information

### Repository Structure

Onlook is structured as a monorepo with the following key directories:

- **apps/web/**: Main web application (Next.js)
- **docs/**: Documentation site (Next.js with Fumadocs)
- **packages/**: Shared packages and utilities

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

### Community

- **GitHub**: https://github.com/onlook-dev/onlook
- **Discord**: https://discord.gg/hERDfFZCsH
- **Website**: ${webUrl}
- **Documentation**: ${docsUrl}

---

For the most up-to-date information, visit our documentation at ${docsUrl}
`;

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'llms-txt',
        },
    });
}
