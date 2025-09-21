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
                    editorEngine.style.update('display', newValue);
                }}
                className="flex-1"
            />
        </div>
    );
});