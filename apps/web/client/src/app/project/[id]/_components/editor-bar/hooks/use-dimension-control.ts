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
        // Use defined styles because computed styles always return px
        const definedStyles = editorEngine.style.selectedStyle?.styles.defined;
        if (!definedStyles) {
            return createDefaultState(dimension);
        }

        const dimensionValue = definedStyles[dimension]?.toString() ?? '--';
        const { num, unit } = stringToParsedValue(dimensionValue);

        const maxDimensionKey = `max-${dimension}` as keyof CSSProperties;
        const maxDimensionValue = definedStyles[maxDimensionKey]?.toString() ?? '--';

        const { num: maxNum, unit: maxUnit } = stringToParsedValue(maxDimensionValue);

        const minDimensionKey = `min-${dimension}` as keyof CSSProperties;
        const minDimensionValue = definedStyles[minDimensionKey]?.toString() ?? '--';
        const { num: minNum, unit: minUnit } = stringToParsedValue(minDimensionValue);

        const defaultState = createDefaultState(dimension);
        const capitalized = (dimension.charAt(0).toUpperCase() + dimension.slice(1)) as Capitalize<T>;

        const getDropdownValue = (value: string) => {
            const { mode } = parseModeAndValue(value);
            switch (mode) {
                case LayoutMode.Fit:
                    return 'Hug';
                case LayoutMode.Fill:
                    return 'Fill';
                case LayoutMode.Relative:
                    return 'Relative';
                case LayoutMode.Fixed:
                    return 'Fixed';
                default:
                    return 'Fixed';
            }
        };

        return {
            ...defaultState,
            [dimension]: {
                num: num,
                unit: unit,
                value: num ? `${num}${unit}` : 'auto',
                dropdownValue: getDropdownValue(dimensionValue),
            },
            [`max${capitalized}`]: {
                num: maxNum,
                unit: maxUnit,
                value: maxNum ? `${maxNum}${maxUnit}` : '--',
                dropdownValue: getDropdownValue(maxDimensionValue),
            },
            [`min${capitalized}`]: {
                num: minNum,
                unit: minUnit,
                value: minNum ? `${minNum}${minUnit}` : '--',
                dropdownValue: getDropdownValue(minDimensionValue),
            },
        } as DimensionStateMap<T>;
    }, [dimension, editorEngine.style.selectedStyle]);

    const [dimensionState, setDimensionState] = useState<DimensionStateMap<T>>(getInitialState());

    useEffect(() => {
        setDimensionState(getInitialState());
    }, [getInitialState]);

    const handleDimensionChange = useCallback((property: DimensionProperty<T>, value: number) => {
        const parsedValue =  value;
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
