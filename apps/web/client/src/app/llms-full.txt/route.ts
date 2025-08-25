export function GET() {
    const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';
    
    const content = `# Onlook - Complete Documentation

> Open-source visual editor for React apps. Design directly in your live React app and generate clean code.

## Project Overview

Onlook is a visual editor that enables designers to make live edits to React and TailwindCSS projects directly within the browser DOM.

### Key Features

- **Visual Editing**: Edit React components directly in the browser
- **Code Generation**: Automatically generates clean, production-ready code
- **TailwindCSS Integration**: Full support for Tailwind styling
- **AI Assistance**: Built-in AI chat for design and development help

### Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Supabase, tRPC, Drizzle ORM
- **AI Integration**: Anthropic Claude, OpenRouter
- **Development**: TypeScript, Bun

## Getting Started

1. Visit our documentation: ${docsUrl}
2. Join our Discord: https://discord.gg/hERDfFZCsH
3. Check out the GitHub repo: https://github.com/onlook-dev/onlook

## Community

- **GitHub**: https://github.com/onlook-dev/onlook
- **Discord**: https://discord.gg/hERDfFZCsH
- **Documentation**: ${docsUrl}
`;

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'llms-txt',
        },
    });
}
