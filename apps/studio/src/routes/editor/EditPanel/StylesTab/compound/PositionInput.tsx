import { useEditorEngine } from '@/components/Context';
import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { stringToParsedValue } from '@/lib/editor/styles/numberUnit';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import TextInput from '../single/TextInput';
import { cn } from '@onlook/ui/utils';
import SelectInput from '../single/SelectInput';
import { Icons } from '@onlook/ui/icons/index';
import type { DomElement } from '@onlook/models/element';

const PositionInput = observer(({ compoundStyle }: { compoundStyle: CompoundStyleImpl }) => {
    const editorEngine = useEditorEngine();
    const [showIndividualControls, setShowIndividualControls] = useState(false);

    useEffect(() => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            return;
        }

        setShowIndividualControls(compoundStyle.head.getValue(selectedStyle.styles) === 'absolute');
    }, [editorEngine.style.selectedStyle]);

    const onMainValueChanged = (key: string, value: string) => {
        if (value === 'absolute') {
            setShowIndividualControls(true);
            centerElement();
        } else {
            editorEngine.style.updateStyleNoAction(
                Object.fromEntries(
                    compoundStyle.children.map((elementStyle) => [elementStyle.key, 'auto']),
                ),
            );
            setShowIndividualControls(false);
        }
    };

    const onValueChange = (key: string, value: string) => {
        editorEngine.style.updateStyleNoAction(
            Object.fromEntries([
                [key, value],
                ...compoundStyle.children.map((elementStyle) => [
                    elementStyle.key,
                    elementStyle.getValue(editorEngine.style.selectedStyle?.styles || {}),
                ]),
            ]),
        );
    };

    const centerElement = async () => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            return;
        }

        const element = editorEngine.elements.selected[0];
        if (!element?.domId) {
            return;
        }

        const webview = editorEngine.webviews.getWebview(element.webviewId);
        if (!webview) {
            return;
        }

        const parent: DomElement | null = await webview.executeJavaScript(
            `window.api?.getParentElement('${element.domId}')`,
        );
        if (!parent) {
            return;
        }

        // Calculate center position
        const centerX = (parent.rect.width - element.rect.width) / 2;
        const centerY = (parent.rect.height - element.rect.height) / 2;

        // Check if element is already centered (within 1px tolerance)
        const currentLeft = element.rect.x - parent.rect.x;
        const currentTop = element.rect.y - parent.rect.y;

        if (Math.abs(currentLeft - centerX) < 1 && Math.abs(currentTop - centerY) < 1) {
            return;
        }

        compoundStyle.children.forEach((elementStyle) => {
            const position = elementStyle.displayName.toLowerCase();
            switch (position) {
                case 'left':
                    editorEngine.style.updateStyleNoAction({ [elementStyle.key]: `${centerX}px` });
                    break;
                case 'top':
                    editorEngine.style.updateStyleNoAction({ [elementStyle.key]: `${centerY}px` });
                    break;
                case 'right':
                case 'bottom':
                    editorEngine.style.updateStyleNoAction({ [elementStyle.key]: 'auto' });
                    break;
            }
        });
    };

    const renderMainControl = () => (
        <div className="flex flex-row items-center justify-between w-full">
            <p className="text-xs text-foreground-onlook">{compoundStyle.head.displayName}</p>
            <div className="flex flex-row space-x-1">
                <SelectInput elementStyle={compoundStyle.head} onValueChange={onMainValueChanged} />
            </div>
        </div>
    );

    function renderVisualInput() {
        const elementStyles = compoundStyle.children;

        return (
            <div className="relative h-36 w-52 flex items-center justify-center mb-4 mx-auto">
                {elementStyles.map((elementStyle) => {
                    const position = elementStyle.displayName.toLowerCase();

                    return (
                        <TextInput
                            key={elementStyle.key}
                            elementStyle={elementStyle}
                            onValueChange={onValueChange}
                            className={`
                                absolute w-16 bg-background-onlook text-foreground-onlook text-center rounded p-2
                                ${position === 'top' ? 'top-0 left-1/2 -translate-x-1/2' : ''}
                                ${position === 'bottom' ? 'bottom-0 left-1/2 -translate-x-1/2' : ''}
                                ${position === 'left' ? 'left-0 top-1/2 -translate-y-1/2' : ''}
                                ${position === 'right' ? 'right-0 top-1/2 -translate-y-1/2' : ''}
                            `}
                        />
                    );
                })}

                <div className="w-16 h-16 bg-background-onlook rounded relative flex items-center justify-center px-4 py-4">
                    {elementStyles.map((elementStyle) => {
                        const value = elementStyle.getValue(
                            editorEngine.style.selectedStyle?.styles || {},
                        );
                        const { numberVal } = stringToParsedValue(value);
                        const parsedNum = parseFloat(numberVal);

                        const position = elementStyle.displayName.toLowerCase();

                        return parsedNum && Number(parsedNum) > 0 ? (
                            <div
                                key={`line-${elementStyle.key}`}
                                className={cn(
                                    'absolute bg-red-500 rounded-full',
                                    position === 'top' ? 'w-1 h-3 top-0.5' : '',
                                    position === 'bottom' ? 'w-1 h-3 bottom-0.5' : '',
                                    position === 'left' ? 'h-1 w-3 left-0.5' : '',
                                    position === 'right' ? 'h-1 w-3 right-0.5' : '',
                                )}
                            />
                        ) : null;
                    })}
                    <div
                        className={cn(
                            'flex items-center justify-center border border-foreground-onlook rounded-md w-full h-full cursor-pointer transition-colors bg-background-onlook/75',
                        )}
                        onClick={centerElement}
                    >
                        <Icons.Plus className={cn('w-4 h-4')} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {renderMainControl()}
            {showIndividualControls && renderVisualInput()}
        </div>
    );
});

export default PositionInput;
