import { useEditorEngine } from '@/components/Context';
import { Textarea } from '@/components/ui/textarea';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { MainChannels } from '/common/constants';
import { escapeSelector } from '/common/helpers';

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [inputValue, setInputValue] = useState('');
    const [savedValue, setSavedValue] = useState('');

    useEffect(() => {
        getClasses();
    }, [editorEngine.elements.selected]);

    const getClasses = async () => {
        if (editorEngine.elements.selected.length) {
            const selectedEl = editorEngine.elements.selected[0];
            const classes = await getCodeClasses(selectedEl.selector);

            const value = classes.join(' ');
            setInputValue(value);
            setSavedValue(value);
        }
    };

    const getCodeClasses = async (selector: string): Promise<string[]> => {
        const classes = [];
        const instance = editorEngine.ast.getInstance(selector);
        if (instance) {
            const instanceClasses: string[] = await window.api.invoke(
                MainChannels.GET_CODE_BLOCK_CLASSES,
                instance,
            );
            classes.push(...instanceClasses);
        }
        const root = editorEngine.ast.getRoot(selector);
        if (root) {
            const rootClasses: string[] = await window.api.invoke(
                MainChannels.GET_CODE_BLOCK_CLASSES,
                root,
            );
            classes.push(...rootClasses);
        }

        return classes;
    };

    const getDomClasses = async (selector: string) => {
        const selectedEl = editorEngine.elements.selected[0];
        const webview = editorEngine.webviews.getWebview(selectedEl.webviewId);
        if (!webview) {
            console.error('Error getting tw class: Webview not found');
            return;
        }
        const classes = webview.executeJavaScript(
            `window.api?.getElementClasses('${escapeSelector(selectedEl.selector)}')`,
        );
        return classes;
    };

    const handleNewInput = (event: any) => {
        const newClass = event.target.value;
        setInputValue(newClass);

        const addedClasses = newClass.split(' ').filter((c: string) => !savedValue.includes(c));
        const removedClasses = savedValue.split(' ').filter((c: string) => !newClass.includes(c));
        editorEngine.style.updateElementClass(addedClasses, removedClasses);
    };

    const onFocus = () => {
        editorEngine.history.startTransaction();
    };

    const onBlur = () => {
        editorEngine.history.commitTransaction();
    };

    return (
        <Textarea
            className="w-full text-xs break-normal bg-bg/75 focus-visible:ring-0"
            placeholder="Add tailwind classes here"
            value={inputValue}
            onChange={handleNewInput}
            onFocus={onFocus}
            onBlur={onBlur}
        />
    );
});

export default TailwindInput;
