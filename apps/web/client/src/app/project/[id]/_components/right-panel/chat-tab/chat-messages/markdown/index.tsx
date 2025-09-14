import { cn } from '@onlook/ui/utils';
import { marked } from 'marked';
import { memo, useMemo } from 'react';
import { MarkdownBlock } from './block';

export const MarkdownRenderer = memo(({
    type,
    messageId,
    content,
    className = '',
    applied,
    isStream,
}: {
    type: 'text' | 'reasoning';
    messageId: string;
    content: string;
    className?: string;
    applied: boolean;
    isStream: boolean;
}) => {
    const transformedContent = useMemo(
        () => content.replace(/^(.*?)\n```(\w+)\n/gm, (_, filePath, language) =>
            `\`\`\`${language}:${filePath}\n`
        ),
        [content]
    );

    const blocks = useMemo(() => {
        const tokens = marked.lexer(transformedContent);
        return tokens.map(token => token.raw);
    }, [transformedContent]);

    return (
        <div
            className={cn(
                // TODO: Restore dark:invert once theming is fixed
                'prose prose-stone prose-invert prose-compact text-small break-words select-text',
                className,
            )}
        >
            {blocks.map((block, index) => (
                <MarkdownBlock
                    content={block}
                    key={`${messageId}-${index}`}
                />
            ))}
        </div>
    );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';
