import { cn } from '@onlook/ui/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownRenderer = ({
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
    const transformedContent = content.replace(
        /^(.*?)\n```(\w+)\n/gm,
        (_, filePath, language) => `\`\`\`${language}:${filePath}\n`,
    );

    return (
        <div
            className={cn(
                // TODO: Restore dark:invert once theming is fixed
                'prose prose-stone prose-invert prose-compact text-small break-words select-text',
                className,
            )}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    pre: ({ node, ...props }) => (
                        <pre
                            className="m-0 p-0 mb-2 rounded-lg bg-none border-0.5 border-border-primary"
                            {...props}
                        />
                    ),
                }}
            >
                {transformedContent}
            </ReactMarkdown>
        </div>
    );
};
