import { ElementStyle, ElementStyleType } from '@/lib/editor/engine/styles/models';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ColorInput from './ColorInput';
import { UpdateElementStyleCallback } from './InputsCommon';
import NumberUnitInput from './NumberUnitInput';
import SelectInput from './SelectInput';
import TextInput from './TextInput';
import { Change } from '/common/actions';

interface Props {
    elementStyles: ElementStyle[];
    updateElementStyle: UpdateElementStyleCallback;
}

const BorderInput = ({ elementStyles, updateElementStyle }: Props) => {
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
            updateElementStyle('borderWidth', { original: change.original, updated: '0px' });
            setShowGroup(false);
        } else {
            if (borderWidthStyle?.value === '0px') {
                borderWidthStyle.value = '1px';
                updateElementStyle('borderWidth', { original: change.original, updated: '1px' });
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

        updateElementStyle(key, change);
    };

    function renderColorInput(elementStyle: ElementStyle) {
        return (
            <div key={elementStyle.key} className="flex flex-row items-center col-span-2">
                <p className="text-xs text-left text-tertiary">{elementStyle.displayName}</p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                    <ColorInput
                        elementStyle={elementStyle}
                        updateElementStyle={handleUpdateStyle}
                    />
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
                    <div className="text-tertiary">
                        <p className="text-xs text-left">{elementStyle.displayName}</p>
                    </div>
                    <div className="w-32 ml-auto">
                        {elementStyle.type === ElementStyleType.Select ? (
                            <SelectInput
                                elementStyle={elementStyle}
                                updateElementStyle={handleUpdateStyle}
                            />
                        ) : elementStyle.type === ElementStyleType.Number ? (
                            <NumberUnitInput
                                elementStyle={elementStyle}
                                updateElementStyle={handleUpdateStyle}
                            />
                        ) : (
                            <TextInput
                                elementStyle={elementStyle}
                                updateElementStyle={handleUpdateStyle}
                            />
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
