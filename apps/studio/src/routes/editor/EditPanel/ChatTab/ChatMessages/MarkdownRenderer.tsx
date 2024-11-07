import { cn } from '@onlook/ui/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer = ({ content, className = '' }: { content: string; className?: string }) => {
    return (
        <div
            className={cn(
                'prose prose-stone dark:prose-invert prose-compact text-small',
                className,
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
