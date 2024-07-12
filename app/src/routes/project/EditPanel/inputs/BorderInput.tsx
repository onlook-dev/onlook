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
        setShowGroup(
            elementStyles.some(
                (elementStyle) =>
                    elementStyle.key === 'borderWidth' && elementStyle.value !== '0px',
            ),
        );
        if (!showGroup) {
            elementStyles.forEach((elementStyle) => {
                if (elementStyle.key === 'borderColor') {
                    elementStyle.value = 'initial';
                }
            });
        }
    }, [elementStyles, showGroup]);

    const colorUpdate = (key: string, value: string) => {
        if (key === 'borderColor') {
            if (value === '' || value === 'initial') {
                updateElementStyle('borderWidth', '0px');
                setShowGroup(false);
            } else {
                setShowGroup(true);
            }
        }
        updateElementStyle(key, value);
    };

    return (
        <div className="flex flex-col gap-2 mb-2">
            {elementStyles.map((elementStyle) =>
                elementStyle.key === 'borderColor' ? (
                    <div key={elementStyle.key} className="flex flex-row items-center col-span-2">
                        <p className="text-xs text-left text-tertiary">
                            {elementStyle.displayName}
                        </p>
                        <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                            <ColorInput
                                elementStyle={elementStyle}
                                updateElementStyle={colorUpdate}
                            />
                        </div>
                    </div>
                ) : (
                    showGroup && (
                        <motion.div
                            key={elementStyle.key}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="ml-2 flex flex-row items-center"
                        >
                            <div className="text-tertiary">
                                <p className="text-xs text-left">{elementStyle.displayName}</p>
                            </div>
                            <div className="w-32 ml-auto">
                                {elementStyle.type === ElementStyleType.Select ? (
                                    <SelectInput
                                        elementStyle={elementStyle}
                                        updateElementStyle={updateElementStyle}
                                    />
                                ) : elementStyle.type === ElementStyleType.Number ? (
                                    <NumberUnitInput
                                        elementStyle={elementStyle}
                                        updateElementStyle={updateElementStyle}
                                    />
                                ) : (
                                    <TextInput
                                        elementStyle={elementStyle}
                                        updateElementStyle={updateElementStyle}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )
                ),
            )}
        </div>
    );
};

export default BorderInput;
