import { useEditorEngine } from '@/components/store/editor';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { toNormalCase } from '@onlook/utility';
import { camelCase } from 'lodash';
import { useEffect, useState } from 'react';

interface ColorNameInputProps {
    initialName: string;
    onSubmit: (newName: string) => void;
    onCancel: () => void;
    existingNames?: string[];
    autoFocus?: boolean;
    disabled?: boolean;
    onBlur?: (value: string) => void;
}

export const ColorNameInput = ({
    initialName,
    onSubmit,
    onCancel,
    existingNames = [],
    autoFocus = true,
    disabled = false,
    onBlur,
}: ColorNameInputProps) => {
    const [inputValue, setInputValue] = useState(toNormalCase(initialName));
    const [error, setError] = useState<string | null>(null);
    const editorEngine = useEditorEngine();
    const themeManager = editorEngine.theme;

    useEffect(() => {
        setInputValue(toNormalCase(initialName));
    }, [initialName]);

    const validateName = (value: string): string | null => {
        if (value === '') {
            return 'Color name cannot be empty';
        }

        // Allow full numbers (e.g. "123") but not allow names starting with numbers (e.g. "1abc")
        if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
            return 'Color name can only contain text, numbers, and spaces';
        }
        if (/^[0-9]/.test(value) && !/^[0-9\s]+$/.test(value)) {
            return 'Color name cannot start with a number';
        }

        // Skip this check if we're editing the same name
        if (camelCase(value) === camelCase(initialName)) {
            return null;
        }

        // Check if name already exists in theme manager or in provided list
        // Check in provided list first
        if (existingNames.length > 0) {
            if (existingNames.includes(camelCase(value))) {
                return 'Color name already exists';
            }
        } else {
            // Check in theme manager
            const themeManagerNames = Object.keys(themeManager.colorGroups);
            if (themeManagerNames.includes(camelCase(value))) {
                return 'Color name already exists';
            }
        }

        return null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setError(validateName(newValue.trim()));
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
                    onKeyDown={handleKeyDown}
                    onBlur={() => onBlur?.(inputValue)}
                    className={`text-sm font-normal w-full rounded-md border ${
                        error ? 'border-red-500' : 'border-white/10'
                    } bg-background-secondary px-2 py-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Enter color name"
                    autoFocus={autoFocus}
                    disabled={disabled}
                />
            </TooltipTrigger>
            <TooltipPortal>
                <TooltipContent side="top" className="text-white bg-red-500 max-w-xs">
                    {error}
                </TooltipContent>
            </TooltipPortal>
        </Tooltip>
    );
};
