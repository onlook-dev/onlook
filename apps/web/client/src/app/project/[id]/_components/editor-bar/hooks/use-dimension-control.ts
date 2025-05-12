import { useEditorEngine } from '@/components/store/editor';
import {
    getAutolayoutStyles,
    LayoutMode,
    LayoutProperty,
    parseModeAndValue,
    stringToParsedValue,
} from '@onlook/utility';
import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback } from 'react';

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
    const capitalized = (dimension.charAt(0).toUpperCase() + dimension.slice(1)) as Capitalize<T>;
    return {
        [dimension]: {
            num: undefined,
            unit: 'px',
            value: 'auto',
            dropdownValue: 'Hug',
        },
        [`min${capitalized}`]: {
            num: undefined,
            unit: 'px',
            value: '--',
            dropdownValue: 'Fixed',
        },
        [`max${capitalized}`]: {
            num: undefined,
            unit: 'px',
            value: '--',
            dropdownValue: 'Fixed',
        },
    } as DimensionStateMap<T>;
};

export const useDimensionControl = <T extends DimensionType>(dimension: T) => {
    const editorEngine = useEditorEngine();

    const getInitialState = useCallback((): DimensionStateMap<T> => {
        const computedStyles = editorEngine.style.selectedStyle?.styles.computed;
        if (!computedStyles) {
            return createDefaultState(dimension);
        }
        const { num, unit } = stringToParsedValue(computedStyles[dimension]?.toString() ?? '--');
        const { num: maxNum, unit: maxUnit } = stringToParsedValue(
            computedStyles[
                `max${dimension.charAt(0).toUpperCase() + dimension.slice(1)}` as keyof CSSProperties
            ]?.toString() ?? '--',
        );
        const { num: minNum, unit: minUnit } = stringToParsedValue(
            computedStyles[
                `min${dimension.charAt(0).toUpperCase() + dimension.slice(1)}` as keyof CSSProperties
            ]?.toString() ?? '--',
        );

        const defaultState = createDefaultState(dimension);
        const capitalized = (dimension.charAt(0).toUpperCase() +
            dimension.slice(1)) as Capitalize<T>;

        return {
            ...defaultState,
            [dimension]: {
                num: num,
                unit: unit,
                value: num ? `${num}${unit}` : 'auto',
                dropdownValue: num ? 'Fixed' : 'Hug',
            },
            [`max${capitalized}`]: {
                num: maxNum,
                unit: maxUnit,
                value: maxNum ? `${maxNum}${maxUnit}` : '--',
                dropdownValue: 'Fixed',
            },
            [`min${capitalized}`]: {
                num: minNum,
                unit: minUnit,
                value: minNum ? `${minNum}${minUnit}` : '--',
                dropdownValue: 'Fixed',
            },
        } as DimensionStateMap<T>;
    }, [dimension, editorEngine.style.selectedStyle]);

    const [dimensionState, setDimensionState] = useState<DimensionStateMap<T>>(getInitialState());

    useEffect(() => {
        setDimensionState(getInitialState());
    }, [getInitialState]);

    const handleDimensionChange = useCallback((property: DimensionProperty<T>, value: string) => {
        const parsedValue = value === '--' ? undefined : value;
        const currentState = dimensionState[property];

        if (!currentState) return;

        editorEngine.style.update(property, `${parsedValue}${currentState.unit}`);
    }, [dimensionState, editorEngine.style]);

    const handleUnitChange = useCallback((property: DimensionProperty<T>, unit: string) => {
        const currentState = dimensionState[property];

        if (!currentState) return;

        if (currentState.num !== undefined) {
            editorEngine.style.update(property, `${currentState.num}${unit}`);
        }
    }, [dimensionState, editorEngine.style]);

    const handleLayoutChange = useCallback((property: DimensionProperty<T>, value: string) => {
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

        const { num, unit } = stringToParsedValue(newLayoutValue);

        if (num !== undefined) {
            editorEngine.style.update(property, `${num}${unit}`);
        }
    }, [editorEngine.style]);

    return {
        dimensionState,
        handleDimensionChange,
        handleUnitChange,
        handleLayoutChange,
    };
};
