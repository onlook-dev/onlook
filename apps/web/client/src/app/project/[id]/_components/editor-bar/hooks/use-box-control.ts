import { useEditorEngine } from "@/components/store";
import { capitalizeFirstLetter, stringToParsedValue } from "@onlook/utility";
import { useEffect, useState } from "react";

export type BoxType = 'margin' | 'padding' | 'border' | 'radius';
export type BoxSide = 'Top' | 'Right' | 'Bottom' | 'Left';
export type RadiusCorner = 'TopLeftRadius' | 'TopRightRadius' | 'BottomRightRadius' | 'BottomLeftRadius';
export type BoxProperty = BoxType | `${BoxType}${BoxSide}` | `border${RadiusCorner}`;

interface BoxState {
    num: number | undefined;
    unit: string;
    value: string;
}

type BoxStateMap = Record<BoxProperty, BoxState>;

const createDefaultState = (type: BoxType): BoxStateMap => {
    const state = {} as BoxStateMap;

    state[type] = {
        num: undefined,
        unit: 'px',
        value: '--'
    };

    if (type === 'radius') {
        const corners: RadiusCorner[] = ['TopLeftRadius', 'TopRightRadius', 'BottomRightRadius', 'BottomLeftRadius'];
        corners.forEach(corner => {
            const property = `border${corner}` as BoxProperty;
            state[property] = {
                num: undefined,
                unit: 'px',
                value: '--'
            };
        });
    } else {
        const sides: BoxSide[] = ['Top', 'Right', 'Bottom', 'Left'];
        sides.forEach(side => {
            const property = `${type}${side}` as BoxProperty;
            state[property] = {
                num: undefined,
                unit: 'px',
                value: '--'
            };
        });
    }

    return state;
};

export const useBoxControl = (type: BoxType) => {
    const editorEngine = useEditorEngine();

    const getInitialState = (): BoxStateMap => {
        const defaultState = createDefaultState(type);

        const { num, unit } = stringToParsedValue(editorEngine.style.getValue(type) ?? "--");
        defaultState[type] = {
            num,
            unit,
            value: num ? `${num}${unit}` : '--'
        };

        if (type === 'radius') {
            const corners: RadiusCorner[] = ['TopLeftRadius', 'TopRightRadius', 'BottomRightRadius', 'BottomLeftRadius'];
            corners.forEach(corner => {
                const property = `border${corner}` as BoxProperty;
                const { num, unit } = stringToParsedValue(editorEngine.style.getValue(property) ?? "--");
                defaultState[property] = {
                    num,
                    unit,
                    value: num ? `${num}${unit}` : '--'
                };
            });
        } else {
            const sides: BoxSide[] = ['Top', 'Right', 'Bottom', 'Left'];
            sides.forEach(side => {
                const property = `${type}${side}` as BoxProperty;
                const { num, unit } = stringToParsedValue(editorEngine.style.getValue(property) ?? "--");
                defaultState[property] = {
                    num,
                    unit,
                    value: num ? `${num}${unit}` : '--'
                };
            });
        }

        return defaultState;
    };

    const [boxState, setBoxState] = useState<BoxStateMap>(getInitialState());

    useEffect(() => {
        setBoxState(getInitialState());
    }, [editorEngine.style.selectedStyle]);

    const handleBoxChange = (property: BoxProperty, value: string) => {
        const parsedValue = value === '--' ? undefined : value;
        const currentState = boxState[property];

        if (!currentState) return;

        setBoxState(prev => ({
            ...prev,
            [property]: {
                ...currentState,
                num: parsedValue,
                value: parsedValue ? `${parsedValue}${currentState.unit}` : '--'
            }
        }));
        editorEngine.style.update(property, `${parsedValue}${currentState.unit}`);
    };

    const handleUnitChange = (property: BoxProperty, unit: string) => {
        const currentState = boxState[property];

        if (!currentState) return;

        setBoxState(prev => ({
            ...prev,
            [property]: {
                ...currentState,
                unit,
                value: currentState.num ? `${currentState.num}${unit}` : '--'
            }
        }));

        if (currentState.num !== undefined) {
            editorEngine.style.update(property, `${currentState.num}${unit}`);
        }
    };

    const handleIndividualChange = (value: number, side: string) => {
        const property = type === 'radius'
            ? `border${capitalizeFirstLetter(side)}` as BoxProperty
            : `${type}${capitalizeFirstLetter(side)}` as BoxProperty;
        const currentState = boxState[property];

        if (!currentState) return;

        setBoxState(prev => ({
            ...prev,
            [property]: {
                ...currentState,
                num: value,
                value: `${value}${currentState.unit}`
            }
        }));
        editorEngine.style.update(property, `${value}${currentState.unit}`);
    };

    return {
        boxState,
        handleBoxChange,
        handleUnitChange,
        handleIndividualChange
    };
}; 