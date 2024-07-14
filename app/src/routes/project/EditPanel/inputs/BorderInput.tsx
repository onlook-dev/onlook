import { ElementStyle, ElementStyleType } from '@/lib/editor/engine/styles/models';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ColorInput from './ColorInput';
import NumberUnitInput from './NumberUnitInput';
import SelectInput from './SelectInput';
import TextInput from './TextInput';

interface Props {
    elementStyles: ElementStyle[];
    updateElementStyle: (key: string, value: string) => void;
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

    function handleUpdateStyle(key: string, value: string) {
        if (key === 'borderColor') {
            if (value === '' || value === 'initial') {
                updateElementStyle('borderWidth', '0px');
                setShowGroup(false);
            } else {
                setShowGroup(true);
            }
        }

        elementStyles.forEach((elementStyle) => {
            if (elementStyle.key === key) {
                elementStyle.value = value;
            }
        });

        updateElementStyle(key, value);
    }

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
