export function GET() {
    const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';
    
    const content = `# Onlook

> Open-source visual editor for React apps. Design directly in your live React app and generate clean code.

## Getting Started

- [Documentation](${docsUrl})
- [First Project](${docsUrl}/getting-started/first-project)
- [UI Overview](${docsUrl}/getting-started/ui-overview)

## Resources

- [GitHub Repository](https://github.com/onlook-dev/onlook)
- [Discord Community](https://discord.gg/hERDfFZCsH)
- [FAQ](${docsUrl}/faq)
`;

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'llms-txt',
        },
    });
}
