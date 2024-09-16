import { Textarea } from '@/components/ui/textarea';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';

interface Props {
    appendedClass: string[];
    updateElementClass: (newClass: string) => void;
}
const TailwindInput = observer(({ appendedClass, updateElementClass }: Props) => {
    const [inputValue, setInputValue] = useState(appendedClass.length > 0 ? appendedClass[0] : '');
    const editorEngine = useEditorEngine();

    useEffect(() => {}, [appendedClass]);

    const handleNewInput = (event: any) => {
        const newClass = event.target.value;
        updateElementClass(newClass);
    };

    const onFocus = () => {
        editorEngine.history.startTransaction();
    };

    const onBlur = () => {
        editorEngine.history.commitTransaction();
    };

    return (
        <div className="space-y-2 px-1">
            <p className="text-xs w-24 mr-2 text-start opacity-60">Tailwind</p>
            <Textarea
                className="w-full text-xs break-normal"
                placeholder="Add tailwind classes here"
                value={inputValue}
                onChange={handleNewInput}
                onFocus={onFocus}
                onBlur={onBlur}
            />
        </div>
    );
});

export default TailwindInput;
