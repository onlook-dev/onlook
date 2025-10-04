'use client';

import { useEditorEngine } from '@/components/store/editor';
import { reaction } from 'mobx';
import { useEffect, useState } from 'react';

export interface CodePosition {
    line: number;
    column: number;
}

export interface CodeRange {
    start: CodePosition;
    end: CodePosition;
}

export interface CodeNavigationTarget {
    filePath: string;
    range: CodeRange;
}

export function useCodeNavigation() {
    const editorEngine = useEditorEngine();
    const [navigationTarget, setNavigationTarget] = useState<CodeNavigationTarget | null>(null);

    useEffect(() => {
        const disposer = reaction(
            () => editorEngine.elements.selected,
            async (selectedElements) => {
                const [selectedElement] = selectedElements;
                if (!selectedElement) {
                    setNavigationTarget(null);
                    return;
                }

                const oid = selectedElement.instanceId ?? selectedElement.oid;
                if (!oid) {
                    console.warn('[CodeNavigation] No OID found for selected element');
                    return;
                }

                try {
                    const branchData = editorEngine.branches.getBranchDataById(selectedElement.branchId);
                    if (!branchData) {
                        console.warn(`[CodeNavigation] No branch data found for branchId: ${selectedElement.branchId}`);
                        return;
                    }

                    const metadata = await branchData.codeEditor.getJsxElementMetadata(oid);
                    if (!metadata) {
                        console.warn(`[CodeNavigation] No metadata found for OID: ${oid}`);
                        return;
                    }

                    const startLine = metadata.startTag.start.line;
                    const startColumn = metadata.startTag.start.column;

                    const endTag = metadata.endTag || metadata.startTag;
                    const endLine = endTag.end.line;
                    const endColumn = endTag.end.column;

                    const target: CodeNavigationTarget = {
                        filePath: metadata.path,
                        range: {
                            start: { line: startLine, column: startColumn },
                            end: { line: endLine, column: endColumn }
                        }
                    };

                    setNavigationTarget(target);
                } catch (error) {
                    console.error('[CodeNavigation] Error getting element metadata:', error);
                    setNavigationTarget(null);
                }
            },
            { fireImmediately: true }
        );

        return () => disposer();
    }, [editorEngine]);

    return navigationTarget;
}