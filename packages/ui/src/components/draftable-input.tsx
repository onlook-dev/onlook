import * as React from 'react';

import { mergeRefs } from 'react-merge-refs';

export function useDraftValue<T>(
    value: T,
    onChange: (value: T) => void,
): [
    T, // draft
    (value: T) => void, // on change draft value
    () => void, // on change done
] {
    const [draft, setDraft] = React.useState(value);

    React.useEffect(() => {
        setDraft(value);
    }, [value]);

    return [draft, setDraft, () => onChange(draft)];
}

export type DraftableInputProps = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'ref' | 'value'
> & {
    ref?: React.Ref<HTMLInputElement>;
    value?: string;
    onChangeValue?: (value: string) => void;
};

const DraftableInput = React.forwardRef<HTMLInputElement, DraftableInputProps>(
    ({ value, placeholder, onChangeValue, ...props }, ref) => {
        const inputRef = React.createRef<HTMLInputElement>();

        const [draft, onDraftChange, onDraftChangeDone] = useDraftValue<string>(
            value ?? '',
            onChangeValue ?? (() => {}),
        );

        React.useEffect(() => {
            const input = inputRef.current;
            if (input) {
                const onChangeNative = () => {
                    onDraftChangeDone();
                };
                input.addEventListener('change', onChangeNative);
                return () => {
                    input.removeEventListener('change', onChangeNative);
                };
            }
        }, [inputRef, onDraftChangeDone]);

        return (
            <input
                {...props}
                value={draft}
                placeholder={placeholder}
                onChange={(e) => onDraftChange(e.currentTarget.value)}
                ref={mergeRefs([inputRef, ref])}
            />
        );
    },
);

DraftableInput.displayName = 'DraftableInput';

export { DraftableInput };
