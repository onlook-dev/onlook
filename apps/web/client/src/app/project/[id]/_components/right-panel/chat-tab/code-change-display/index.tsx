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
    const editorEngine = useEditorEngine();

    const applyChange = async () => {
        await editorEngine.chat.code.applyCode(messageId);
    };

    const rejectChange = async () => {
        await editorEngine.chat.code.revertCode(messageId);
    };

    return (
        <div className="group relative">
            <CollapsibleCodeBlock
                path={path}
                content={content}
                originalContent={content}
                updatedContent={content}
                applied={applied}
                isStream={isStream}
                onApply={applyChange}
                onRevert={rejectChange}
            />
        </div>
    );
};

export default CodeChangeDisplay;
