import { useEditorEngine } from '@/components/Context';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { MainChannels } from '/common/constants';
import { CodeDiffRequest } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [instance, setInstance] = useState<TemplateNode | null>(null);
    const [root, setRoot] = useState<TemplateNode | null>(null);
    const [instanceClasses, setInstanceClasses] = useState<string>('');
    const [rootClasses, setRootClasses] = useState<string>('');

    useEffect(getClasses, [editorEngine.elements.selected]);

    function getClasses() {
        if (editorEngine.elements.selected.length) {
            const selectedEl = editorEngine.elements.selected[0];
            getInstanceClasses(selectedEl.selector);
            getRootClasses(selectedEl.selector);
        }
    }

    async function getInstanceClasses(selector: string) {
        const instance = editorEngine.ast.getInstance(selector);
        setInstance(instance || null);
        if (instance) {
            const instanceClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                instance,
            );
            setInstanceClasses(instanceClasses.join(' '));
        }
    }

    async function getRootClasses(selector: string) {
        const root = editorEngine.ast.getRoot(selector);
        setRoot(root || null);
        if (root) {
            const rootClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                root,
            );
            setRootClasses(rootClasses.join(' '));
        }
    }

    const createCodeDiffRequest = useCallback(
        async (templateNode: TemplateNode, className: string) => {
            const codeDiffRequest: CodeDiffRequest = {
                templateNode,
                selector: editorEngine.elements.selected[0].selector,
                attributes: { className },
                insertedElements: [],
                movedElements: [],
            };
            const codeDiffMap = new Map<TemplateNode, CodeDiffRequest>();
            codeDiffMap.set(templateNode, codeDiffRequest);
            const codeDiffs = await editorEngine.code.getCodeDiff(codeDiffMap);
            const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
            if (res) {
                setTimeout(getClasses, 100);
            }
        },
        [editorEngine],
    );

    const debouncedCreateCodeDiffRequest = useCallback(debounce(createCodeDiffRequest, 500), [
        createCodeDiffRequest,
    ]);

    function handleInstanceInput(e: ChangeEvent<HTMLTextAreaElement>) {
        setInstanceClasses(e.target.value);
        if (instance && editorEngine.elements.selected.length) {
            const className = e.target.value;
            debouncedCreateCodeDiffRequest(instance, className);
        }
    }

    function handleRootInput(e: ChangeEvent<HTMLTextAreaElement>) {
        setRootClasses(e.target.value);
        if (root && editorEngine.elements.selected.length) {
            const className = e.target.value;
            debouncedCreateCodeDiffRequest(root, className);
        }
    }

    return (
        <div className="flex flex-col gap-2 text-xs text-text">
            {instance && <p>Instance</p>}
            {instance && (
                <Textarea
                    className="w-full text-xs text-text-active break-normal bg-bg/75 focus-visible:ring-0"
                    placeholder="Add tailwind classes here"
                    value={instanceClasses}
                    onInput={handleInstanceInput}
                />
            )}

            {instance && root && <p>Component</p>}
            {root && (
                <Textarea
                    className="w-full text-xs text-text-active break-normal bg-bg/75 focus-visible:ring-0"
                    placeholder="Add tailwind classes here"
                    value={rootClasses}
                    onInput={handleRootInput}
                />
            )}
        </div>
    );
});

export default TailwindInput;
