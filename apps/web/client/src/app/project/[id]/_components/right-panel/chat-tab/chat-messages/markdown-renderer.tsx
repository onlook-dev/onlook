import { cn } from '@onlook/ui/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeChangeDisplay } from '../code-change-display';
import { BashCodeDisplay } from '../code-change-display/bash-code-display';

export const MarkdownRenderer = ({
    messageId,
    content,
    className = '',
    applied,
    isStream,
}: {
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
                'prose prose-stone prose-invert prose-compact text-small break-words',
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
                        const language = match?.[1];
                        const filePath = match?.[2]?.substring(1);
                        const codeContent = String(children).replace(/\n$/, '');

                        if (language === 'bash') {
                            return <BashCodeDisplay content={codeContent} isStream={isStream} />;
                        }

                        if (match && filePath) {
                            return (
                                <CodeChangeDisplay
                                    path={filePath}
                                    content={codeContent}
                                    messageId={messageId}
                                    applied={applied}
                                    isStream={isStream}
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
