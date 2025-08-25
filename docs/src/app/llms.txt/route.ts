export function GET() {
    const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';
    
    const content = `# Onlook Documentation

> Comprehensive documentation for Onlook - the open-source visual editor for React apps.

## Getting Started

- [Introduction](${docsUrl})
- [First Project](${docsUrl}/getting-started/first-project)
- [UI Overview](${docsUrl}/getting-started/ui-overview)
- [Core Features](${docsUrl}/getting-started/core-features)

## Contributing

- [Developer Guide](${docsUrl}/contributing/developers)
- [Running Locally](${docsUrl}/contributing/developers/running-locally)
- [Architecture Overview](${docsUrl}/contributing/developers/architecture)

## Support

- [FAQ](${docsUrl}/faq)
- [GitHub Repository](https://github.com/onlook-dev/onlook)
- [Discord Community](https://discord.gg/hERDfFZCsH)
`;

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'llms-txt',
        },
    });
}
