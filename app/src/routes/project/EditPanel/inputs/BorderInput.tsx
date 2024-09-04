import { ElementStyle, ElementStyleType } from '@/lib/editor/styles/models';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';
import { UpdateElementStyleCallback } from './InputsCommon';
import ColorInput from './primitives/ColorInput';
import NumberUnitInput from './primitives/NumberUnitInput';
import SelectInput from './primitives/SelectInput';
import TextInput from './primitives/TextInput';
import { Change } from '/common/actions';

const BorderInput = ({ elementStyles }: { elementStyles: ElementStyle[] }) => {
    const editorEngine = useEditorEngine();
    const [showGroup, setShowGroup] = useState(false);
    useEffect(() => {
        const shouldShowGroup = elementStyles.some(
            (elementStyle) => elementStyle.key === 'borderWidth' && elementStyle.value !== '0px',
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

    const handleBorderRemoved = (change: Change<string>) => {
        const borderWidthStyle = elementStyles.find(
            (elementStyle) => elementStyle.key === 'borderWidth',
        );
        if (change.updated === '' || change.updated === 'initial') {
            if (borderWidthStyle) {
                borderWidthStyle.value = '0px';
            }
            editorEngine.style.updateElementStyle('borderWidth', {
                original: change.original,
                updated: '0px',
            });
            setShowGroup(false);
        } else {
            if (borderWidthStyle?.value === '0px') {
                borderWidthStyle.value = '1px';
                editorEngine.style.updateElementStyle('borderWidth', {
                    original: change.original,
                    updated: '1px',
                });
            }
            setShowGroup(true);
        }
    };

    const handleUpdateStyle: UpdateElementStyleCallback = (key, change) => {
        if (key === 'borderColor') {
            handleBorderRemoved(change);
        }

        elementStyles.forEach((elementStyle) => {
            if (elementStyle.key === key) {
                elementStyle.value = change.updated;
            }
        });

        editorEngine.style.updateElementStyle(key, change);
    };

    function renderColorInput(elementStyle: ElementStyle) {
        return (
            <div key={elementStyle.key} className="flex flex-row items-center col-span-2">
                <p className="text-xs text-left text-text">{elementStyle.displayName}</p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                    <ColorInput elementStyle={elementStyle} />
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
};

export default BorderInput;
