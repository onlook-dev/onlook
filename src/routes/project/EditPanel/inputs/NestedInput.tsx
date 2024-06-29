import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import {
    BorderAllIcon,
    BorderBottomIcon,
    BorderLeftIcon,
    BorderRightIcon,
    BorderTopIcon,
    CornerBottomLeftIcon,
    CornerBottomRightIcon,
    CornerTopLeftIcon,
    CornerTopRightIcon,
    CornersIcon,
} from '@radix-ui/react-icons';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import TextInput from './TextInput';

interface Props {
    elementStyles: ElementStyle[];
    updateElementStyle: (key: string, value: any, immediate?: boolean) => void;
}

const NestedInputs = ({ elementStyles, updateElementStyle }: Props) => {
    const [showGroup, setShowGroup] = useState(false);

    useEffect(() => {
        if (elementStyles) {
            setShowGroup(!elementStyles.every(style => style.value === elementStyles[0].value));
        }
    }, [elementStyles]);

    const updatedUpdateElementStyle = (key: string, value: any) => {
        updateElementStyle(key, value, true);
    };

    return (
        <div className="grid grid-cols-2 gap-2 my-2">
            {elementStyles.map((elementStyle) => (
                elementStyle.key === "margin" || elementStyle.key === "padding" || elementStyle.key === "borderRadius" ? (
                    <div key={`${elementStyle.key}-${elementStyle.group}-${elementStyle.subGroup}`} className="flex flex-row items-center col-span-2">
                        <p className="text-xs text-left text-tertiary">
                            {elementStyle.displayName}
                        </p>
                        <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                            <TextInput
                                elementStyle={elementStyle}
                                updateElementStyle={updatedUpdateElementStyle}
                            />
                            <ToggleGroup
                                size="sm"
                                type="single"
                                value={showGroup ? "true" : "false"}
                                onValueChange={(val) => setShowGroup(val === "true")}
                            >
                                <ToggleGroupItem value="false"><BorderAllIcon className="w-4 h-5" /></ToggleGroupItem>
                                <ToggleGroupItem value="true"><CornersIcon className="w-4 h-5" /></ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </div>
                ) : showGroup && (
                    <motion.div key={`${elementStyle.key}-${elementStyle.group}-${elementStyle.subGroup}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-row items-center">
                        <div className="w-12 text-tertiary">
                            {elementStyle.displayName === "Top" ? <BorderTopIcon className="w-4 h-4" /> :
                                elementStyle.displayName === "Bottom" ? <BorderBottomIcon className="w-4 h-4" /> :
                                    elementStyle.displayName === "Right" ? <BorderRightIcon className="w-4 h-4" /> :
                                        elementStyle.displayName === "Left" ? <BorderLeftIcon className="w-4 h-4" /> :
                                            elementStyle.displayName === "Top Right" ? <CornerTopRightIcon className="w-4 h-4" /> :
                                                elementStyle.displayName === "Top Left" ? <CornerTopLeftIcon className="w-4 h-4" /> :
                                                    elementStyle.displayName === "Bottom Right" ? <CornerBottomRightIcon className="w-4 h-4" /> :
                                                        elementStyle.displayName === "Bottom Left" ? <CornerBottomLeftIcon className="w-4 h-4" /> : (
                                                            <p className="text-xs text-left">{elementStyle.displayName}</p>
                                                        )}
                        </div>
                        <TextInput elementStyle={elementStyle} updateElementStyle={updatedUpdateElementStyle} />
                    </motion.div>
                )
            ))}
        </div>
    );
};

export default NestedInputs;
