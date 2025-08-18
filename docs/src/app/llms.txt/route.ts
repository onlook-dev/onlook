interface LLMSSection {
    title: string;
    links: Array<[string, string]>;
}

interface LLMSData {
    title: string;
    description: string;
    sections: LLMSSection[];
}

function renderMarkdown(data: LLMSData): string {
    let output = `# ${data.title}\n\n> ${data.description}\n\n`;

    for (const section of data.sections) {
        output += `## ${section.title}\n\n`;
        for (const [text, url] of section.links) {
            output += `- [${text}](${url})\n`;
        }
        output += `\n`;
    }

    return output;
}

export function GET() {
    const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';

    const llmsData: LLMSData = {
        title: 'Onlook Documentation',
        description:
            'Comprehensive documentation for Onlook - the open-source visual editor for React apps. Learn how to design directly in your live React app and generate clean code.',
        sections: [
            {
                title: 'Getting Started',
                links: [
                    ['Introduction', `${docsUrl}`],
                    ['First Project', `${docsUrl}/getting-started/first-project`],
                    ['UI Overview', `${docsUrl}/getting-started/ui-overview`],
                    ['Core Features', `${docsUrl}/getting-started/core-features`],
                ],
            },
            {
                title: 'Tutorials',
                links: [
                    ['Importing Templates', `${docsUrl}/tutorials/importing-templates`],
                    ['Figma to Onlook', `${docsUrl}/tutorials/figma-to-onlook`],
                ],
            },
            {
                title: 'Contributing',
                links: [
                    ['Developer Guide', `${docsUrl}/contributing/developers`],
                    ['Running Locally', `${docsUrl}/contributing/developers/running-locally`],
                    ['Architecture Overview', `${docsUrl}/contributing/developers/architecture`],
                    ['Development Appendix', `${docsUrl}/contributing/developers/appendix`],
                ],
            },
            {
                title: 'Migrations',
                links: [
                    [
                        'Electron to Web Migration',
                        `${docsUrl}/migrations/electron-to-web-migration`,
                    ],
                ],
            },
            {
                title: 'Support',
                links: [
                    ['FAQ', `${docsUrl}/faq`],
                    ['GitHub Repository', 'https://github.com/onlook-dev/onlook'],
                    ['Discord Community', 'https://discord.gg/hERDfFZCsH'],
                    ['Contact', 'mailto:contact@onlook.com'],
                ],
            },
        ],
    };

    const content = renderMarkdown(llmsData);

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'llms-txt',
        },
    });
}
