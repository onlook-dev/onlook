import { useEditorEngine } from '@/components/Context';
import { Textarea } from '@/components/ui/textarea';
import { sendAnalytics } from '@/lib/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, useRef } from 'react';
import { MainChannels } from '/common/constants';
import { CodeDiffRequest } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';
import { set } from 'lodash';

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [instanceClasses, setInstanceClasses] = useState<string>('');
    const [rootClasses, setRootClasses] = useState<string>('');
    const [textFocus, setTextFocus] = useState(false);
    const [textRootFocus, setTextRootFocus] = useState(false);
    const textAreaSize = useRef<HTMLTextAreaElement>(null);
    const textAreaRootSize = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (editorEngine.elements.selected.length) {
            const selectedEl = editorEngine.elements.selected[0];
            getInstanceClasses(selectedEl.selector);
            getRootClasses(selectedEl.selector);
        }
    }, [editorEngine.elements.selected]);

    async function getInstanceClasses(selector: string) {
        const instance = editorEngine.ast.getInstance(selector);
        setInstance(instance);
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
        setRoot(root);
        if (root) {
            const rootClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                root,
            );
            setRootClasses(rootClasses.join(' '));
        }
    }

    const createCodeDiffRequest = async (templateNode: TemplateNode, className: string) => {
        const request: CodeDiffRequest = {
            templateNode,
            selector: editorEngine.elements.selected[0].selector,
            attributes: { className },
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            overrideClasses: true,
        };
        const codeDiffs = await editorEngine.code.getCodeDiff([request]);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);

        if (res) {
            editorEngine.webviews.getAll().forEach((webview) => {
                webview.executeJavaScript(`window.api?.processDom()`);
            });

            setTimeout(() => {
                const selected = editorEngine.elements.selected;
                if (selected.length === 0) {
                    console.error('No selected element');
                    return;
                }
                const selectedEl = selected[0];
                setInstance(editorEngine.ast.getInstance(selectedEl.selector));
                const root = editorEngine.ast.getRoot(selectedEl.selector);
                setRoot(root);
            }, 1000);

            sendAnalytics('tailwind action');
        }
    };

    function handleKeyDown(e: any) {
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
            e.target.blur();
            e.preventDefault();
        }
    }

    const adjustHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + 20}px`;
    };

    useEffect(() => {
        if (textAreaSize.current) {
            adjustHeight(textAreaSize.current);
        }
    }, [instanceClasses]);

    useEffect(() => {
        if (textAreaRootSize.current) {
            adjustHeight(textAreaRootSize.current);
        }
    }, [rootClasses]);

    return (
        <div className="flex flex-col gap-2 text-xs text-foreground-onlook">
            {instance && <p>Instance</p>}
            {instance && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={textAreaSize}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0"
                            placeholder="Add tailwind classes here"
                            value={instanceClasses}
                            onInput={(e: any) => setInstanceClasses(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={(e) => {
                                setTextFocus(false);
                                instance && createCodeDiffRequest(instance, e.target.value);
                            }}
                            onFocus={() => setTextFocus(true)}
                        />
                    </div>
                    {textFocus &&
                        <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                            <span>enter to apply</span>
                            <img
                                src="https://private-user-images.githubusercontent.com/14104075/376804165-1c07a8f8-38be-45ff-9cfe-63cffa95aabc.svg?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjkwMzY0MTcsIm5iZiI6MTcyOTAzNjExNywicGF0aCI6Ii8xNDEwNDA3NS8zNzY4MDQxNjUtMWMwN2E4ZjgtMzhiZS00NWZmLTljZmUtNjNjZmZhOTVhYWJjLnN2Zz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDEwMTUlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMDE1VDIzNDgzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTk0NWVhYjM4ZWQ2MTM1Nzc4Njg2MjBmMzIzOWNkOTZmNDEwMTM3ZDAwNGRiOGYyM2ZiMDA3MmUwMTRiMjUyOGMmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.6XV_3cTYSIIbmy5hP3-Dr9Sbo_iLLDfAZI8lHs6Sj5k"
                                className="ml-1"
                            />
                        </div>
                    }
                </div>
            )}

            {instance && root && <p>Component</p>}
            {root && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={textAreaRootSize}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0 resize-none"
                            placeholder="Add tailwind classes here"
                            value={rootClasses}
                            onInput={(e: any) => setRootClasses(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={(e) => {
                                setTextRootFocus(false);
                                root && createCodeDiffRequest(root, e.target.value)
                            }}
                            onFocus={() => setTextRootFocus(true)}
                        />
                    </div>
                    {textRootFocus && (
                        <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                            <span>enter to apply</span>
                            <img
                                src="https://private-user-images.githubusercontent.com/14104075/376804165-1c07a8f8-38be-45ff-9cfe-63cffa95aabc.svg?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjkwMzY0MTcsIm5iZiI6MTcyOTAzNjExNywicGF0aCI6Ii8xNDEwNDA3NS8zNzY4MDQxNjUtMWMwN2E4ZjgtMzhiZS00NWZmLTljZmUtNjNjZmZhOTVhYWJjLnN2Zz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDEwMTUlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMDE1VDIzNDgzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTk0NWVhYjM4ZWQ2MTM1Nzc4Njg2MjBmMzIzOWNkOTZmNDEwMTM3ZDAwNGRiOGYyM2ZiMDA3MmUwMTRiMjUyOGMmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.6XV_3cTYSIIbmy5hP3-Dr9Sbo_iLLDfAZI8lHs6Sj5k"
                                className="ml-1"
                            />
                        </div>
                    )}

                </div>
            )}
        </div>
    );
});

export default TailwindInput;
