import { useEditorEngine } from '@/components/Context';
import { getTruncatedFileName } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import type { CodeSearchReplace } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, useMemo } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';
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
