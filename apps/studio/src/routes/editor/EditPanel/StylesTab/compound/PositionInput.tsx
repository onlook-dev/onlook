import { useEditorEngine } from '@/components/Context';
import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import TextInput from '../single/TextInput';
import { cn } from '@onlook/ui/utils';
import SelectInput from '../single/SelectInput';
import { Icons } from '@onlook/ui/icons/index';
import type { DomElement } from '@onlook/models/element';

const PositionInput = observer(({ compoundStyle }: { compoundStyle: CompoundStyleImpl }) => {
    const editorEngine = useEditorEngine();

    const [lines, setLines] = useState({
        top: false,
        bottom: false,
        left: false,
        right: false,
        center: false,
    });

    const onLineClicked = (key: 'top' | 'bottom' | 'left' | 'right') => {
        setLines((prev) => {
            const newState = {
                ...prev,
                [key]: !prev[key],
                center: prev.center && prev[key],
            };

            if (!newState[key]) {
                editorEngine.style.update(key, '');
            }
            return newState;
        });
    };

    const onMainValueChanged = (key: string, value: string) => {
        if (value === 'absolute') {
            centerElement();
        } else {
            editorEngine.style.updateStyleNoAction(
                Object.fromEntries(
                    compoundStyle.children.map((elementStyle) => [elementStyle.key, 'auto']),
                ),
            );
            setLines({
                top: false,
                bottom: false,
                left: false,
                right: false,
                center: false,
            });
        }
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

        const centerX = (parent.rect.width - element.rect.width) / 2;
        const centerY = (parent.rect.height - element.rect.height) / 2;

        if (lines.center) {
            return;
        }

        editorEngine.history.startTransaction();

        editorEngine.style.updateMultiple({
            left: `${Math.round(centerX)}px`,
            top: `${Math.round(centerY)}px`,
        });

        editorEngine.history.commitTransaction();

        setLines({
            center: true,
            top: true,
            bottom: true,
            left: true,
            right: true,
        });
    };

    const checkIfCentered = useCallback(async () => {
        const element = editorEngine.elements.selected[0];
        if (!element?.domId) {
            return false;
        }

        const webview = editorEngine.webviews.getWebview(element.webviewId);
        if (!webview) {
            return false;
        }

        const parent: DomElement | null = await webview.executeJavaScript(
            `window.api?.getParentElement('${element.domId}')`,
        );
        if (!parent) {
            return false;
        }

        const centerX = (parent.rect.width - element.rect.width) / 2;
        const centerY = (parent.rect.height - element.rect.height) / 2;
        const currentLeft = element.rect.x - parent.rect.x;
        const currentTop = element.rect.y - parent.rect.y;

        return Math.abs(currentLeft - centerX) < 1 && Math.abs(currentTop - centerY) < 1;
    }, [editorEngine]);

    useEffect(() => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            return;
        }

        const position = selectedStyle.styles['position'];
        if (position !== 'absolute') {
            setLines((prev) => ({ ...prev, center: false }));
            return;
        }

        const updateCenterState = async () => {
            const isCentered = await checkIfCentered();
            setLines((prev) => ({
                ...prev,
                center: isCentered,
                top: isCentered,
                bottom: isCentered,
                left: isCentered,
                right: isCentered,
            }));
        };

        updateCenterState();
    }, [editorEngine.style, checkIfCentered]);

    const renderMainControl = () => (
        <div className="flex flex-row items-center justify-between w-full">
            <p className="text-xs text-foreground-onlook">{compoundStyle.head.displayName}</p>
            <div className="flex flex-row space-x-1">
                <SelectInput elementStyle={compoundStyle.head} onValueChange={onMainValueChanged} />
            </div>
        </div>
    );

    const renderCenterButton = useCallback((isCenter: boolean) => {
        return (
            <div
                className={cn(
                    'bg-background-onlook rounded relative flex items-center justify-center px-2 py-2 border border-background-active',
                )}
                onClick={() => centerElement()}
            >
                <Icons.Plus
                    className={cn(
                        'w-4 h-4 hover:text-red-500 transition-colors hover:cursor-pointer hover:scale-110',
                        isCenter ? 'text-red-500' : 'text-gray-400',
                    )}
                />
            </div>
        );
    }, []);

    const renderLines = useCallback(
        (state: {
            top: boolean;
            bottom: boolean;
            left: boolean;
            right: boolean;
            center: boolean;
        }) => {
            return (
                <div className="w-16 h-16 bg-background-onlook rounded relative flex items-center justify-center px-4 py-4">
                    {renderCenterButton(state.center)}
                    <div
                        key="top"
                        className={cn(
                            'absolute rounded-full cursor-pointer transition-colors',
                            state.top
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-background-active hover:bg-primary',
                            'w-1 h-3 top-0.5',
                        )}
                        onClick={() => onLineClicked('top')}
                    />
                    <div
                        key="right"
                        className={cn(
                            'absolute rounded-full cursor-pointer transition-colors',
                            state.right
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-background-active hover:bg-primary',
                            'h-1 w-3 right-0.5',
                        )}
                        onClick={() => onLineClicked('right')}
                    />
                    <div
                        key="bottom"
                        className={cn(
                            'absolute rounded-full cursor-pointer transition-colors',
                            state.bottom
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-background-active hover:bg-primary',
                            'w-1 h-3 bottom-0.5',
                        )}
                        onClick={() => onLineClicked('bottom')}
                    />
                    <div
                        key="left"
                        className={cn(
                            'absolute rounded-full cursor-pointer transition-colors',
                            state.left
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-background-active hover:bg-primary',
                            'h-1 w-3 left-0.5',
                        )}
                        onClick={() => onLineClicked('left')}
                    />
                </div>
            );
        },
        [compoundStyle.children, editorEngine.style.selectedStyle],
    );

    const renderVisualInput = useCallback(() => {
        const elementStyles = compoundStyle.children;
        if (
            compoundStyle.head.getValue(editorEngine.style.selectedStyle?.styles || {}) !==
            'absolute'
        ) {
            return;
        }

        return (
            <div className="relative h-36 w-52 flex items-center justify-center mb-4 mx-auto">
                {elementStyles.map((elementStyle) => {
                    const position = elementStyle.key.toLowerCase();
                    const isActive = lines[position as 'top' | 'bottom' | 'left' | 'right'];
                    return (
                        <TextInput
                            key={elementStyle.key}
                            elementStyle={elementStyle}
                            disabled={!isActive}
                            className={cn(
                                `
                                absolute w-16 bg-background-onlook text-foreground-onlook text-center rounded p-2
                                ${position === 'top' ? 'top-0 left-1/2 -translate-x-1/2' : ''}
                                ${position === 'bottom' ? 'bottom-0 left-1/2 -translate-x-1/2' : ''}
                                ${position === 'left' ? 'left-0 top-1/2 -translate-y-1/2' : ''}
                                ${position === 'right' ? 'right-0 top-1/2 -translate-y-1/2' : ''}
                            `,
                                !isActive && 'opacity-50 cursor-not-allowed',
                            )}
                        />
                    );
                })}
                {renderLines(lines)}
            </div>
        );
    }, [compoundStyle.children, editorEngine.style.selectedStyle, lines]);

    return (
        <div className="space-y-2">
            {renderMainControl()}
            {renderVisualInput()}
        </div>
    );
});

export default PositionInput;
