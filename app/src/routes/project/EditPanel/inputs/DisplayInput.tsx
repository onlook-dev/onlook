import { ElementStyle, ElementStyleType } from '@/lib/editor/styles/models';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import GridRowColInput from './GridRowColInput';
import NumberUnitInput from './primitives/NumberUnitInput';
import SelectInput from './primitives/SelectInput';
import TextInput from './primitives/TextInput';

const DISPLAY_TYPES: Record<string, string> = {
    flex: 'flex',
    grid: 'grid',
    block: 'block',
};

const DISPLAY_GROUP = {
    [DISPLAY_TYPES.flex]: ['flexDirection', 'justifyContent', 'alignItems', 'gap'],
    [DISPLAY_TYPES.grid]: ['gridTemplateColumns', 'gridTemplateRows', 'gap'],
};

const DisplayInput = observer(({ elementStyles }: { elementStyles: ElementStyle[] }) => {
    const [type, setType] = useState<string>('block');

    useEffect(() => {
        const displayStyle = elementStyles.find((style) => style.key === 'display');
        if (displayStyle) {
            setType(displayStyle.value);
        }
    }, [elementStyles]);

    const onDisplayTypeChange = (key: string, value: string) => {
        if (key === 'display') {
            setType(value);
        }
    };

    return (
        <div className="flex flex-col gap-2 mb-2">
            {elementStyles.map((elementStyle, index) =>
                elementStyle.key === 'display' ? (
                    <div key={index} className="flex flex-row items-center col-span-2">
                        <p className="text-xs text-left text-text">{elementStyle.displayName}</p>
                        <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                            <SelectInput
                                elementStyle={elementStyle}
                                onValueChange={onDisplayTypeChange}
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
                            <div className="text-text">
                                <p className="text-xs text-left">{elementStyle.displayName}</p>
                            </div>
                            <div className="w-32 ml-auto">
                                {elementStyle.key === 'gridTemplateColumns' ||
                                elementStyle.key === 'gridTemplateRows' ? (
                                    <GridRowColInput elementStyle={elementStyle} />
                                ) : elementStyle.type === ElementStyleType.Select ? (
                                    <SelectInput elementStyle={elementStyle} />
                                ) : elementStyle.type === ElementStyleType.Number ? (
                                    <NumberUnitInput elementStyle={elementStyle} />
                                ) : (
                                    <TextInput elementStyle={elementStyle} />
                                )}
                            </div>
                        </motion.div>
                    )
                ),
            )}
        </div>
    );
});

export default DisplayInput;
