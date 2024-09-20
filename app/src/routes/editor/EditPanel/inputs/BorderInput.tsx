import { useEditorEngine } from '@/components/Context';
import { ElementStyle, ElementStyleType } from '@/lib/editor/styles/models';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ColorInput from './primitives/ColorInput';
import NumberUnitInput from './primitives/NumberUnitInput';
import SelectInput from './primitives/SelectInput';
import TextInput from './primitives/TextInput';

const BorderInput = observer(({ elementStyles }: { elementStyles: ElementStyle[] }) => {
    const editorEngine = useEditorEngine();
    const [showGroup, setShowGroup] = useState(false);

    useEffect(() => {
        const shouldShowGroup = elementStyles.some(
            (elementStyle) =>
                elementStyle.key === 'borderColor' &&
                elementStyle.value !== '' &&
                elementStyle.value !== 'initial',
        );

        if (!showGroup) {
            elementStyles.forEach((elementStyle) => {
                if (elementStyle.key === 'borderColor') {
                    elementStyle.value = 'initial';
                }
            });
        }

        setShowGroup(shouldShowGroup);
    }, [elementStyles]);

    const onColorValueChange = (key: string, value: string) => {
        const borderWidthStyle = elementStyles.find(
            (elementStyle) => elementStyle.key === 'borderWidth',
        );

        if (!borderWidthStyle) {
            console.error('Border width style not found');
            return;
        }

        let newBorderWidth = borderWidthStyle.value;
        let shouldShowGroup = false;

        if (value === '' || value === 'initial') {
            if (borderWidthStyle.value !== '0px') {
                newBorderWidth = '0px';
            }
            shouldShowGroup = false;
        } else {
            if (borderWidthStyle && borderWidthStyle.value === '0px') {
                newBorderWidth = '1px';
            }
            shouldShowGroup = true;
        }

        editorEngine.style.updateElementStyle('borderWidth', {
            original: borderWidthStyle?.value,
            updated: newBorderWidth,
        });
        borderWidthStyle.value = newBorderWidth;
        setShowGroup(shouldShowGroup);
    };

    function renderColorInput(elementStyle: ElementStyle) {
        return (
            <div key={elementStyle.key} className="flex flex-row items-center col-span-2">
                <p className="text-xs text-left text-text">{elementStyle.displayName}</p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                    <ColorInput elementStyle={elementStyle} onValueChange={onColorValueChange} />
                </div>
            </div>
        );
    }

    function renderLowerBorderInputs(elementStyle: ElementStyle) {
        return (
            showGroup && (
                <motion.div
                    key={elementStyle.key}
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="ml-2 flex flex-row items-center"
                >
                    <div className="text-text">
                        <p className="text-xs text-left">{elementStyle.displayName}</p>
                    </div>
                    <div className="w-32 ml-auto">
                        {elementStyle.type === ElementStyleType.Select ? (
                            <SelectInput elementStyle={elementStyle} />
                        ) : elementStyle.type === ElementStyleType.Number ? (
                            <NumberUnitInput elementStyle={elementStyle} />
                        ) : (
                            <TextInput elementStyle={elementStyle} />
                        )}
                    </div>
                </motion.div>
            )
        );
    }

    return (
        <div className="flex flex-col gap-2 mb-2">
            {elementStyles.map((elementStyle) =>
                elementStyle.key === 'borderColor'
                    ? renderColorInput(elementStyle)
                    : renderLowerBorderInputs(elementStyle),
            )}
        </div>
    );
});

export default BorderInput;
