import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useState } from 'react';
import type { CssValue } from '.';
import { InputRadio } from '../../inputs/input-radio';

const directionOptions: Record<string, CssValue> = {
    column: { value: 'column', label: 'Vertical', icon: <Icons.ArrowDown className="h-4 w-4" /> },
    row: { value: 'row', label: 'Horizontal', icon: <Icons.ArrowRight className="h-4 w-4" /> },
};

export const DirectionInput = () => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(
        editorEngine.style.selectedStyle?.styles.computed.flexDirection ?? 'column',
    );

    useEffect(() => {
        setValue(editorEngine.style.selectedStyle?.styles.computed.flexDirection ?? 'column');
    }, [editorEngine.style.selectedStyle?.styles.computed.flexDirection]);

    // Check if flexbox is active
    const displayValue = editorEngine.style.selectedStyle?.styles.computed.display;
    const isFlexboxActive = displayValue === 'flex' || displayValue === 'inline-flex';

    // Don't render if flexbox is not active
    if (!isFlexboxActive) {
        return null;
    }

    return (
        <div className="flex items-center gap-0">
            <span className="text-sm text-muted-foreground w-20">Direction</span>
            <InputRadio
                options={Object.values(directionOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.updateMultiple({
                        'flex-direction': newValue,
                        display: 'flex',
                    });
                }}
                className="flex-1"
            />
        </div>
    );
};
