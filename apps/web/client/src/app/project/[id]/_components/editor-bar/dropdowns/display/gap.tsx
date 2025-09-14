import { useEditorEngine } from '@/components/store/editor';
import { stringToParsedValue } from '@onlook/utility';
import { useEffect, useState } from 'react';
import { InputIcon } from '../../inputs/input-icon';

export const GapInput = () => {
    const editorEngine = useEditorEngine();
    const { num, unit } = stringToParsedValue(
        editorEngine.style.selectedStyle?.styles.computed.gap?.toString() ?? '12px',
    );
    const [numValue, setNumValue] = useState(num);
    const [unitValue, setUnitValue] = useState(unit);

    useEffect(() => {
        const { num, unit } = stringToParsedValue(
            editorEngine.style.selectedStyle?.styles.computed.gap?.toString() ?? '12px',
        );
        setNumValue(num);
        setUnitValue(unit);
    }, [editorEngine.style.selectedStyle?.styles.computed.gap]);

    return (
        <div className="flex items-center gap-0 w-full">
            <span className="text-sm text-muted-foreground w-20">Gap</span>
            <div className="flex-1">
                <InputIcon
                    value={numValue}
                    unit={unitValue}
                    onChange={(newValue) => {
                        setNumValue(newValue);
                        editorEngine.style.update('gap', `${newValue}${unitValue}`);
                    }}
                    onUnitChange={(newUnit) => {
                        setUnitValue(newUnit);
                        editorEngine.style.update('gap', `${numValue}${newUnit}`);
                    }}
                />
            </div>
        </div>
    );
};
