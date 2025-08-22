import { useEditorEngine } from '@/components/store/editor';
import { memo, useEffect, useState } from 'react';
import { InputRadio } from '../../inputs/input-radio';
import { layoutTypeOptions } from './index';

export const TypeInput = memo(() => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(
        editorEngine.style.selectedStyle?.styles.computed.display ?? 'block',
    );

    useEffect(() => {
        setValue(editorEngine.style.selectedStyle?.styles.computed.display ?? 'block');
    }, [editorEngine.style.selectedStyle?.styles.computed.display]);

    return (
        <div className="flex items-center gap-0">
            <span className="text-sm text-muted-foreground w-20"> Type </span>
            <InputRadio
                options={Object.values(layoutTypeOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    if (newValue === 'flex') {
                        // When switching to flex, set default flex properties
                        editorEngine.style.updateMultiple({
                            display: 'flex',
                            'flex-direction': 'row',
                            'align-items': 'flex-start',
                            'justify-content': 'flex-start',
                        });
                    } else {
                        // When switching away from flex, clear flex properties
                        editorEngine.style.update('display', newValue);
                        // Clear flex-specific properties by setting them to initial values
                        editorEngine.style.update('flex-direction', 'initial');
                        editorEngine.style.update('align-items', 'initial');
                        editorEngine.style.update('justify-content', 'initial');
                    }
                }}
                className="flex-1"
            />
        </div>
    );
});