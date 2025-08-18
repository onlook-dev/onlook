export interface InputState {
    value: string;
    isInputting: boolean;
    isMultiline: boolean;
    isSubmitting: boolean;
}

export const DEFAULT_INPUT_STATE: InputState = {
    value: '',
    isInputting: false,
    isMultiline: false,
    isSubmitting: false,
};

export const DIMENSIONS = {
    singleLineHeight: 32,
    minInputWidth: 280,
    buttonHeight: 36,
    multiLineRows: 4,
    minCharsToSubmit: 4,
};
