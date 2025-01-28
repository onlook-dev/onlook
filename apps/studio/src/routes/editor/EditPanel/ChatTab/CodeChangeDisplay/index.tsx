import { useEditorEngine } from '@/components/Context';
import { CodeBlockProcessor } from '@onlook/ai';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { CollapsibleCodeBlock } from './CollapsibleCodeBlock';

export const CodeChangeDisplay = observer(
    ({
        path,
        content,
        messageId,
        applied,
    }: {
        path: string;
        content: string;
        messageId: string;
        applied: boolean;
    }) => {
        const editorEngine = useEditorEngine();
        const { search: searchContent, replace: replaceContent } = useMemo(
            () => CodeBlockProcessor.parseDiff(content)[0] || { search: '', replace: '' },
            [content],
        );

        const applyChange = () => {
            editorEngine.chat.code.applyCode(messageId);
        };

        const rejectChange = () => {
            editorEngine.chat.code.revertCode(messageId);
        };

        return (
            <div className="group relative">
                <CollapsibleCodeBlock
                    path={path}
                    content={content}
                    searchContent={searchContent}
                    replaceContent={replaceContent}
                    applied={applied}
                    isWaiting={editorEngine.chat.isWaiting}
                    onApply={applyChange}
                    onRevert={rejectChange}
                />
            </div>
        );
    },
);

export default CodeChangeDisplay;
