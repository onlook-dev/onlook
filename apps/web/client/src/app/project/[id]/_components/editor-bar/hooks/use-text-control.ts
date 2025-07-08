import { useEditorEngine } from '@/components/store/editor';
import type { Font } from '@onlook/models';
import { convertFontString } from '@onlook/utility';
import { useEffect, useState } from 'react';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

interface TextState {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    textAlign: TextAlign;
    textColor: string;
    letterSpacing: string;
    capitalization: string;
    textDecorationLine: string;
    lineHeight: string;
}

const DefaultState: TextState = {
    fontFamily: '--',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    textColor: '#000000',
    letterSpacing: '0',
    capitalization: 'none',
    textDecorationLine: 'none',
    lineHeight: '1.5',
};

export const useTextControl = () => {
    const editorEngine = useEditorEngine();

    const getInitialState = (): TextState => {
        return {
            fontFamily: convertFontString(
                editorEngine.style.selectedStyle?.styles.computed.fontFamily ??
                DefaultState.fontFamily,
            ),
            fontSize: parseInt(
                editorEngine.style.selectedStyle?.styles.computed.fontSize?.toString() ??
                DefaultState.fontSize.toString(),
            ),
            fontWeight:
                editorEngine.style.selectedStyle?.styles.computed.fontWeight?.toString() ??
                DefaultState.fontWeight,
            textAlign: (editorEngine.style.selectedStyle?.styles.computed.textAlign ??
                DefaultState.textAlign) as TextAlign,
            textColor:
                editorEngine.style.selectedStyle?.styles.computed.color ?? DefaultState.textColor,
            letterSpacing:
                editorEngine.style.selectedStyle?.styles.computed.letterSpacing?.toString() ??
                DefaultState.letterSpacing,
            capitalization:
                editorEngine.style.selectedStyle?.styles.computed.textTransform?.toString() ??
                DefaultState.capitalization,
            textDecorationLine:
                editorEngine.style.selectedStyle?.styles.computed.textDecorationLine?.toString() ??
                DefaultState.textDecorationLine,
            lineHeight:
                editorEngine.style.selectedStyle?.styles.computed.lineHeight?.toString() ??
                DefaultState.lineHeight,
        };
    };

    const [textState, setTextState] = useState<TextState>(getInitialState());

    useEffect(() => {
        setTextState(getInitialState());
    }, [editorEngine.style.selectedStyle]);

    const handleFontFamilyChange = (fontFamily: Font) => {
        editorEngine.style.updateFontFamily('fontFamily', fontFamily);
        editorEngine.frames.reloadAllViews();
    };

    const handleFontSizeChange = (fontSize: number) => {
        setTextState((prev) => ({
            ...prev,
            fontSize,
        }));
        editorEngine.style.update('fontSize', `${fontSize}px`);
    };

    const handleFontWeightChange = (fontWeight: string) => {
        setTextState((prev) => ({
            ...prev,
            fontWeight,
        }));
        editorEngine.style.update('fontWeight', fontWeight);
    };

    const handleTextAlignChange = (textAlign: TextAlign) => {
        setTextState((prev) => ({
            ...prev,
            textAlign,
        }));
        editorEngine.style.update('textAlign', textAlign);
    };

    const handleTextColorChange = (textColor: string) => {
        setTextState((prev) => ({
            ...prev,
            textColor,
        }));
    };

    const handleLetterSpacingChange = (letterSpacing: string) => {
        setTextState((prev) => ({
            ...prev,
            letterSpacing,
        }));
        editorEngine.style.update('letterSpacing', `${letterSpacing}px`);
    };

    const handleCapitalizationChange = (capitalization: string) => {
        setTextState((prev) => ({
            ...prev,
            capitalization,
        }));
        editorEngine.style.update('textTransform', capitalization);
    };

    const handleTextDecorationChange = (textDecorationLine: string) => {
        setTextState((prev) => ({
            ...prev,
            textDecorationLine,
        }));
        editorEngine.style.update('textDecorationLine', textDecorationLine);
    };

    const handleLineHeightChange = (lineHeight: string) => {
        setTextState((prev) => ({
            ...prev,
            lineHeight,
        }));
        editorEngine.style.update('lineHeight', lineHeight);
    };

    return {
        textState,
        handleFontFamilyChange,
        handleFontSizeChange,
        handleFontWeightChange,
        handleTextAlignChange,
        handleTextColorChange,
        handleLetterSpacingChange,
        handleCapitalizationChange,
        handleTextDecorationChange,
        handleLineHeightChange,
    };
};
