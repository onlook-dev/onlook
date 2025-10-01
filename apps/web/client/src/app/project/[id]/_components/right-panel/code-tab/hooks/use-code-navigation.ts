import { useEditorEngine } from '@/components/store/editor';
import { reaction } from 'mobx';
import { useEffect, useMemo, useState } from 'react';

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
                console.log('[CodeNavigation] Selection changed, elements:', selectedElements.length);
                
                // Clear navigation if no elements selected
                if (selectedElements.length === 0) {
                    console.log('[CodeNavigation] Clearing navigation (no selection)');
                    setNavigationTarget(null);
                    return;
                }

                // Use the first selected element
                const selectedElement = selectedElements[0];
                if (!selectedElement) return;

                // Get OID from either instanceId or oid
                const oid = selectedElement.instanceId ?? selectedElement.oid;
                if (!oid) {
                    console.warn('[CodeNavigation] No OID found for selected element');
                    return;
                }

                try {
                    // Get element metadata from CodeEditorApi
                    const metadata = await editorEngine.codeEditor.getJsxElementMetadata(oid);
                    if (!metadata) {
                        console.warn(`[CodeNavigation] No metadata found for OID: ${oid}`);
                        return;
                    }

                    // Extract position information
                    const startLine = metadata.startTag.start.line;
                    const startColumn = metadata.startTag.start.column;
                    
                    // Use endTag if available, otherwise use startTag
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
                    
                    console.log(`[CodeNavigation] Navigating to ${metadata.path}:${startLine}:${startColumn}`);
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