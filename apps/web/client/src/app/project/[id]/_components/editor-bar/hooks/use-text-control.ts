import { useEditorEngine } from "@/components/store";
import { convertFontString } from "@onlook/utility";
import { useEffect, useState } from "react";

export type TextAlign = "left" | "center" | "right" | "justify";

interface TextState {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    textAlign: TextAlign;
    textColor: string;
}

const DefaultState: TextState = {
    fontFamily: "--",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "left",
    textColor: "#000000",
}

export const useTextControl = () => {
    const editorEngine = useEditorEngine();

    const getInitialState = (): TextState => {
        return {
            fontFamily: convertFontString(editorEngine.style.getValue("fontFamily") ?? DefaultState.fontFamily),
            fontSize: parseInt(editorEngine.style.getValue("fontSize") ?? DefaultState.fontSize.toString()),
            fontWeight: editorEngine.style.getValue("fontWeight") ?? DefaultState.fontWeight,
            textAlign: (editorEngine.style.getValue("textAlign") ?? DefaultState.textAlign) as TextAlign,
            textColor: editorEngine.style.getValue("color") ?? DefaultState.textColor,
        };
    };
    
 
    const [textState, setTextState] = useState<TextState>(getInitialState());

    useEffect(() => {
        setTextState(getInitialState());
    }, [editorEngine.style.selectedStyle]);

    const handleFontFamilyChange = (fontFamily: string) => {
        setTextState(prev => ({
            ...prev,
            fontFamily
        }));
        editorEngine.style.update("fontFamily", fontFamily);
    };

    const handleFontSizeChange = (fontSize: number) => {
        setTextState(prev => ({
            ...prev,
            fontSize
        }));
        editorEngine.style.update("fontSize", `${fontSize}px`);
    };

    const handleFontWeightChange = (fontWeight: string) => {
        setTextState(prev => ({
            ...prev,
            fontWeight
        }));
        editorEngine.style.update("fontWeight", fontWeight);
    };

    const handleTextAlignChange = (textAlign: TextAlign) => {
        setTextState(prev => ({
            ...prev,
            textAlign
        }));
        editorEngine.style.update("textAlign", textAlign);
    };

    const handleTextColorChange = (textColor: string) => {
        setTextState(prev => ({
            ...prev,
            textColor
        }));
        editorEngine.style.update("color", textColor);
    };

    return {
        textState,
        handleFontFamilyChange,
        handleFontSizeChange,
        handleFontWeightChange,
        handleTextAlignChange,
        handleTextColorChange
    };
}; 