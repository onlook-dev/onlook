import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownBlock = memo(({ content }: { content: string }) => (
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
        {content}
    </ReactMarkdown>
));

MarkdownBlock.displayName = 'MarkdownBlock';
