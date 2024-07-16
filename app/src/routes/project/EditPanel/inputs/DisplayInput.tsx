import { ElementStyle, ElementStyleType } from '@/lib/editor/engine/styles/models';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import NumberUnitInput from './NumberUnitInput';
import RowColInput from './RowColInput';
import SelectInput from './SelectInput';
import TextInput from './TextInput';

const DISPLAY_TYPES: Record<string, string> = {
    flex: 'flex',
    grid: 'grid',
    block: 'block',
};

const DISPLAY_GROUP = {
    [DISPLAY_TYPES.flex]: ['flexDirection', 'justifyContent', 'alignItems', 'gap'],
    [DISPLAY_TYPES.grid]: ['gridTemplateColumns', 'gridTemplateRows', 'gap'],
};

interface Props {
    elementStyles: ElementStyle[];
    updateElementStyle: (key: string, value: string, refresh?: boolean) => void;
}

function DisplayInput({ elementStyles, updateElementStyle }: Props) {
    const [type, setType] = useState<string>('block');

    useEffect(() => {
        const displayStyle = elementStyles.find((style) => style.key === 'display');
        if (displayStyle) {
            setType(displayStyle.value);
        }
    }, [elementStyles]);

    const updatedUpdateStyle = (key: string, value: string) => {
        if (key === 'display') {
            setType(value);
        }
        updateElementStyle(key, value, true);
    };

    return (
        <div className="flex flex-col gap-2 mb-2">
            {elementStyles.map((elementStyle, index) =>
                elementStyle.key === 'display' ? (
                    <div key={index} className="flex flex-row items-center col-span-2">
                        <p className="text-xs text-left text-tertiary">
                            {elementStyle.displayName}
                        </p>
                        <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                            <SelectInput
                                elementStyle={elementStyle}
                                updateElementStyle={updatedUpdateStyle}
                            />
                        </div>
                    </div>
                ) : (
                    DISPLAY_GROUP[type] &&
                    DISPLAY_GROUP[type].includes(elementStyle.key) && (
                        <motion.div
                            key={index}
                            className="ml-2 flex flex-row items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="text-tertiary">
                                <p className="text-xs text-left">{elementStyle.displayName}</p>
                            </div>
                            <div className="w-32 ml-auto">
                                {elementStyle.key === 'gridTemplateColumns' ||
                                elementStyle.key === 'gridTemplateRows' ? (
                                    <RowColInput
                                        elementStyle={elementStyle}
                                        updateElementStyle={updateElementStyle}
                                    />
                                ) : elementStyle.type === ElementStyleType.Select ? (
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
}

export default DisplayInput;
