'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { CodeNavigationTarget } from '@onlook/models';
import { pathsEqual } from '@onlook/utility';
import { reaction } from 'mobx';
import { useEffect, useRef, useState } from 'react';

const isNavigationTargetEqual = (navigationTarget1: CodeNavigationTarget | null, navigationTarget2: CodeNavigationTarget | null) => {
    if (!navigationTarget1 || !navigationTarget2) {
        return false;
    }
    return pathsEqual(navigationTarget1.filePath, navigationTarget2.filePath)
        && navigationTarget1.range.start.line === navigationTarget2.range.start.line
        && navigationTarget1.range.start.column === navigationTarget2.range.start.column
        && navigationTarget1.range.end.line === navigationTarget2.range.end.line
        && navigationTarget1.range.end.column === navigationTarget2.range.end.column;
}

export function useCodeNavigation() {
    const editorEngine = useEditorEngine();
    const savedNavigationTarget = useRef<CodeNavigationTarget | null>(null);
    const [navigationTarget, setNavigationTarget] = useState<CodeNavigationTarget | null>(null);

    useEffect(() => {
        const disposer = reaction(
            () => ({
                selected: editorEngine.elements.selected,
                override: editorEngine.ide.codeNavigationOverride
            }),
            async ({ selected: selectedElements, override }) => {
                // If there's an override, use it and ignore selection
                if (override) {
                    if (isNavigationTargetEqual(override, savedNavigationTarget.current)) {
                        return;
                    }
                    savedNavigationTarget.current = override;
                    setNavigationTarget(override);
                    return;
                }

                // If there are selected elements, clear any existing override and process selection
                const [selectedElement] = selectedElements;
                if (selectedElements.length > 0 && editorEngine.ide.hasCodeNavigationOverride()) {
                    // Clear override when user makes a new selection
                    editorEngine.ide.clearCodeNavigationOverride();
                }

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

                    if (isNavigationTargetEqual(target, savedNavigationTarget.current)) {
                        return;
                    }
                    savedNavigationTarget.current = target;
                    setNavigationTarget(target);
                } catch (error) {
                    console.error('[CodeNavigation] Error getting element metadata:', error);
                    setNavigationTarget(null);
                }
            },
            { fireImmediately: true }
        );

        return () => disposer();
    }, []);

    return navigationTarget;
}