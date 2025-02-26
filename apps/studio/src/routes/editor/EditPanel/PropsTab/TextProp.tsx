import { PropsType } from '@onlook/models/element';
import { Input } from '@onlook/ui/input';
import type { Prop } from '.';
interface TextPropProps {
    prop: Prop;
    onChange: (value: string) => void;
    onBlur: (value: string) => void;
    type: PropsType;
}

const TextProp = ({ prop, onChange, onBlur, type }: TextPropProps) => {
    return (
        <Input
            className="w-32 px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            onChange={(e) => onChange(e.target.value)}
            value={prop.value as string}
            type={type === PropsType.Number ? 'number' : 'text'}
            onBlur={(e) => onBlur(e.target.value)}
        />
    );
};

export default TextProp;
