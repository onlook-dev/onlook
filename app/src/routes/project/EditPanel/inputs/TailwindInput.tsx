import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';

interface Props {
    appendedClass: string[];
    updateElementClass: (newClass: string) => void;
}
function TailwindInput({ appendedClass, updateElementClass }: Props) {
    const [inputValue, setInputValue] = useState(appendedClass.length > 0 ? appendedClass[0] : '');

    useEffect(() => {}, [appendedClass]);

    const handleNewInput = (event: any) => {
        const newClass = event.target.value;
        updateElementClass(newClass);
    };

    return (
        <div className="space-y-2 px-1">
            <p className="text-xs w-24 mr-2 text-start opacity-60">Tailwind</p>
            <Textarea
                className="w-full text-xs break-normal"
                placeholder="Add tailwind classes here"
                value={inputValue}
                onChange={handleNewInput}
            />
        </div>
    );
}

export default TailwindInput;
