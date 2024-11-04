import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';

export async function formatJSON(content: string): Promise<string> {
    try {
        const formattedContent = await prettier.format(content, {
            parser: 'json',
            plugins: [parserBabel],
        });
        return formattedContent;
    } catch (error: any) {
        console.error('Error formatting file:', error);
        return content;
    }
}
