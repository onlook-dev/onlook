import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { camelCase } from 'lodash';
import { useState, useEffect } from 'react';
import { toNormalCase } from '@onlook/utility';
import { useEditorEngine } from '@/components/Context';

interface GroupNameInputProps {
    initialName: string;
    onSubmit: (newName: string) => void;
    onCancel: () => void;
    existingNames?: string[];
    autoFocus?: boolean;
    customValidate?: (name: string) => string | null;
}

const GroupNameInput = ({
    initialName,
    onSubmit,
    onCancel,
    existingNames = [],
    autoFocus = true,
    customValidate,
}: GroupNameInputProps) => {
    const [inputValue, setInputValue] = useState(toNormalCase(initialName));
    const [error, setError] = useState<string | null>(null);
    const editorEngine = useEditorEngine();
    const themeManager = editorEngine.theme;

    useEffect(() => {
        setInputValue(toNormalCase(initialName));
    }, [initialName]);

    const validateName = (value: string): string | null => {
        // If custom validation function is provided, use it first
        if (customValidate) {
            const customError = customValidate(value);
            if (customError) {
                return customError;
            }
        }

        // Only allow text characters, numbers, and spaces and not start with number
        if (!/^[a-zA-Z0-9\s]+$/.test(value) || /^[0-9]/.test(value)) {
            return 'Group name can only contain text, numbers, and spaces and not start with number';
        }

        if (value.trim() === '') {
            return 'Group name cannot be empty';
        }

        // Skip this check if we're editing the same name
        if (camelCase(value) === initialName) {
            return null;
        }

        // Check if name already exists in theme manager or in provided list
        const themeManagerNames = Object.keys(themeManager.colorGroups);
        if (
            themeManagerNames.includes(camelCase(value)) ||
            existingNames.includes(camelCase(value))
        ) {
            return 'Group name already exists';
        }

        return null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setError(validateName(newValue));
    };

    const handleSubmit = () => {
        if (!error && inputValue.trim() && camelCase(inputValue) !== initialName) {
            onSubmit(camelCase(inputValue));
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !error) {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <Tooltip open={!!error}>
            <TooltipTrigger asChild>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className={`text-sm font-normal w-full rounded-md border ${
                        error ? 'border-red-500' : 'border-white/10'
                    } bg-background-secondary px-2 py-1`}
                    placeholder="Enter group name"
                    autoFocus={autoFocus}
                />
            </TooltipTrigger>
            <TooltipPortal>
                <TooltipContent side="top" className="text-white bg-red-500">
                    {error}
                </TooltipContent>
            </TooltipPortal>
        </Tooltip>
    );
};

export default GroupNameInput;
