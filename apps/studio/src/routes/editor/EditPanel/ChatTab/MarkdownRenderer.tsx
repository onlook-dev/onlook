import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Customize code blocks and inline code
                    code({ children }) {
                        return (
                            <code className="bg-background-secondary font-mono">{children}</code>
                        );
                    },
                    // Customize paragraphs
                    p({ children }) {
                        return <p className="mb-4 last:mb-0">{children}</p>;
                    },
                    // Customize headings
                    h1({ children }) {
                        return <h1 className="text-2xl font-bold mb-4">{children}</h1>;
                    },
                    h2({ children }) {
                        return <h2 className="text-xl font-bold mb-3">{children}</h2>;
                    },
                    h3({ children }) {
                        return <h3 className="text-lg font-bold mb-2">{children}</h3>;
                    },
                    // Customize links
                    a({ children, href }) {
                        return (
                            <a
                                href={href}
                                className="text-blue-500 hover:text-blue-600 underline"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {children}
                            </a>
                        );
                    },
                    // Customize lists
                    ul({ children }) {
                        return <ul className="list-disc list-inside mb-4">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="list-decimal list-inside mb-4">{children}</ol>;
                    },
                    // Customize blockquotes
                    blockquote({ children }) {
                        return (
                            <blockquote className="border-l-4 border-border pl-4 italic my-4">
                                {children}
                            </blockquote>
                        );
                    },
                    // Customize tables
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto mb-4">
                                <table className="min-w-full divide-y divide-border">
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    th({ children }) {
                        return (
                            <th className="px-4 py-2 bg-background-secondary font-semibold text-left">
                                {children}
                            </th>
                        );
                    },
                    td({ children }) {
                        return <td className="px-4 py-2 border-t border-border">{children}</td>;
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
