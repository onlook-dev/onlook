import { useEditorEngine } from '@/components/store/editor';
import { CollapsibleCodeBlock } from './collapsible-code-block';

export const CodeChangeDisplay = ({
    path,
    content,
    messageId,
    applied,
    isStream = false,
}: {
    path: string;
    content: string;
    messageId: string;
    applied: boolean;
    isStream?: boolean;
}) => {

    return (
        <CollapsibleCodeBlock
            path={path}
            content={content}
            originalContent={content}
            updatedContent={content}
            applied={applied}
            isStream={isStream}
        />
    );
};

export default CodeChangeDisplay;
