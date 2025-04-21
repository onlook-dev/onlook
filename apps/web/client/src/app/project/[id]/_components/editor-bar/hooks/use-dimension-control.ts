import { useEditorEngine } from "@/components/store";
import { getAutolayoutStyles, LayoutMode, LayoutProperty, parseModeAndValue } from "@/components/store/editor/styles/autolayout";
import { stringToParsedValue } from "@onlook/utility";
import { useEffect, useState } from "react";

type DimensionType = 'width' | 'height';
type DimensionProperty<T extends DimensionType> = T | `min${Capitalize<T>}` | `max${Capitalize<T>}`;

interface DimensionState {
    num: number | undefined;
    unit: string;
    value: string;
    dropdownValue: string;
}

type DimensionStateMap<T extends DimensionType> = Record<DimensionProperty<T>, DimensionState>;

const createDefaultState = <T extends DimensionType>(dimension: T): DimensionStateMap<T> => {
    const capitalized = dimension.charAt(0).toUpperCase() + dimension.slice(1) as Capitalize<T>;
    return {
        [dimension]: {
            num: undefined,
            unit: 'px',
            value: 'auto',
            dropdownValue: 'Hug'
        },
        [`min${capitalized}`]: {
            num: undefined,
            unit: 'px',
            value: '--',
            dropdownValue: 'Fixed'
        },
        [`max${capitalized}`]: {
            num: undefined,
            unit: 'px',
            value: '--',
            dropdownValue: 'Fixed'
        }
    } as DimensionStateMap<T>;
};

export const useDimensionControl = <T extends DimensionType>(dimension: T) => {
    const editorEngine = useEditorEngine();
    
    const getInitialState = (): DimensionStateMap<T> => {
        const { num, unit } = stringToParsedValue(editorEngine.style.getValue(dimension) ?? "--");
        const { num: maxNum, unit: maxUnit } = stringToParsedValue(editorEngine.style.getValue(`max${dimension.charAt(0).toUpperCase() + dimension.slice(1)}`) ?? "--");
        const { num: minNum, unit: minUnit } = stringToParsedValue(editorEngine.style.getValue(`min${dimension.charAt(0).toUpperCase() + dimension.slice(1)}`) ?? "--");

        const defaultState = createDefaultState(dimension);
        const capitalized = dimension.charAt(0).toUpperCase() + dimension.slice(1) as Capitalize<T>;

        return {
            ...defaultState,
            [dimension]: {
                num: num,
                unit: unit,
                value: num ? `${num}${unit}` : 'auto',
                dropdownValue: num ? 'Fixed' : 'Hug'
            },
            [`max${capitalized}`]: {
                num: maxNum,
                unit: maxUnit,
                value: maxNum ? `${maxNum}${maxUnit}` : '--',
                dropdownValue: 'Fixed'
            },
            [`min${capitalized}`]: {
                num: minNum,
                unit: minUnit,
                value: minNum ? `${minNum}${minUnit}` : '--',
                dropdownValue: 'Fixed'
            }
        } as DimensionStateMap<T>;
    };

    const [dimensionState, setDimensionState] = useState<DimensionStateMap<T>>(getInitialState());

    useEffect(() => {
        setDimensionState(getInitialState());
    }, [editorEngine.style]);

    const handleDimensionChange = (property: DimensionProperty<T>, value: string) => {
        const parsedValue = value === '--' ? undefined : value;
        const currentState = dimensionState[property];
        
        if (!currentState) return;

        setDimensionState(prev => ({
            ...prev,
            [property]: {
                ...currentState,
                num: parsedValue,
                value: parsedValue ? `${parsedValue}${currentState.unit}` : 'auto'
            }
        }));        
        editorEngine.style.update(property, `${parsedValue}${currentState.unit}`);
    };

    const handleUnitChange = (property: DimensionProperty<T>, unit: string) => {
        const currentState = dimensionState[property];
        
        if (!currentState) return;

        setDimensionState(prev => ({
            ...prev,
            [property]: {
                ...currentState,
                unit,
                value: currentState.num ? `${currentState.num}${unit}` : currentState.value
            }
        }));

        if (currentState.num !== undefined) {
            editorEngine.style.update(property, `${currentState.num}${unit}`);
        }
    }; 

    const handleLayoutChange = (property: DimensionProperty<T>, value: string) => {
        const { layoutValue } = parseModeAndValue(value);
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            console.error('No style record found');
            return;
        }

        const newLayoutValue = getAutolayoutStyles(
            LayoutProperty[property as keyof typeof LayoutProperty],
            LayoutMode[value as keyof typeof LayoutMode],
            layoutValue,
            selectedStyle.rect,
            selectedStyle.parentRect,
        );

        const {num,unit} = stringToParsedValue(newLayoutValue);


        const currentState = dimensionState[property];
        
        if (!currentState) return;
        setDimensionState(prev => ({
            ...prev,
            [property]: {
                ...currentState,
                num,
                unit,
                value:`${num}${unit}`,
                dropdownValue: value
            }
        }));     
        if (num !== undefined) {
            editorEngine.style.update(property, `${num}${unit}`);
        }
    }

    return {
        dimensionState,
        handleDimensionChange,
        handleUnitChange,
        handleLayoutChange
    };
}; 