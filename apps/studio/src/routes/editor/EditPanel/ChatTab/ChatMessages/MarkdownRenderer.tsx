import { cn } from '@onlook/ui/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeChangeDisplay from '../CodeChangeDisplay';

const MarkdownRenderer = ({
    messageId,
    content,
    className = '',
    applied,
}: {
    messageId: string;
    content: string;
    className?: string;
    applied: boolean;
}) => {
    const transformedContent = content.replace(
        /^(.*?)\n```(\w+)\n/gm,
        (_, filePath, language) => `\`\`\`${language}:${filePath}\n`,
    );

    return (
        <div
            className={cn(
                'prose prose-stone dark:prose-invert prose-compact text-small',
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
                    code({ node, className, children, ...props }) {
                        const match = /language-(\w+)(:?.+)?/.exec(className || '');
                        if (match && match[2]?.substring(1)) {
                            const language = match[1];
                            const filePath = match[2]?.substring(1);
                            const codeContent = String(children).replace(/\n$/, '');

                            return (
                                <CodeChangeDisplay
                                    path={filePath}
                                    content={codeContent}
                                    messageId={messageId}
                                    applied={applied}
                                />
                            );
                        }

                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {transformedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
