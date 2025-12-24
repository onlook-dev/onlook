import { useEditorEngine } from '@/components/store/editor';
import { capitalizeFirstLetter, stringToParsedValue } from '@onlook/utility';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type BoxType = 'margin' | 'padding' | 'border' | 'radius';
export type BoxSide = 'Top' | 'Right' | 'Bottom' | 'Left';
export type RadiusCorner = `${BoxSide}${BoxSide}Radius`;
export type BoxProperty =
    | BoxType
    | `${BoxType}${BoxSide}`
    | `border${RadiusCorner}`
    | `border${BoxSide}Width`
    | 'borderColor'
    | `border${BoxSide}Color`;

type CSSBoxProperty = keyof Pick<
    CSSProperties,
    | 'margin'
    | 'marginTop'
    | 'marginRight'
    | 'marginBottom'
    | 'marginLeft'
    | 'padding'
    | 'paddingTop'
    | 'paddingRight'
    | 'paddingBottom'
    | 'paddingLeft'
    | 'borderWidth'
    | 'borderTopWidth'
    | 'borderRightWidth'
    | 'borderBottomWidth'
    | 'borderLeftWidth'
    | 'borderColor'
    | 'borderTopColor'
    | 'borderRightColor'
    | 'borderBottomColor'
    | 'borderLeftColor'
    | 'borderRadius'
    | 'borderTopLeftRadius'
    | 'borderTopRightRadius'
    | 'borderBottomRightRadius'
    | 'borderBottomLeftRadius'
>;

interface BoxState {
    num: number | undefined;
    unit: string;
    value: string;
}

type BoxStateMap = Record<CSSBoxProperty, BoxState>;

const CORNERS_RADIUS: RadiusCorner[] = [
    'TopLeftRadius',
    'TopRightRadius',
    'BottomRightRadius',
    'BottomLeftRadius',
];

const SIDES: BoxSide[] = ['Top', 'Right', 'Bottom', 'Left'];

const createBoxState = (num?: number, unit: string = 'px'): BoxState => ({
    num,
    unit,
    value: num ? `${num}${unit}` : '--',
});

const createDefaultState = (type: BoxType): BoxStateMap => {
    const state = {} as BoxStateMap;

    if (type === 'radius') {
        state.borderRadius = createBoxState();
        CORNERS_RADIUS.forEach((corner) => {
            state[`border${corner}` as CSSBoxProperty] = createBoxState();
        });
    } else if (type === 'border') {
        state.borderWidth = createBoxState();
        SIDES.forEach((side) => {
            state[`border${side}Width` as CSSBoxProperty] = createBoxState();
            state[`border${side}Color` as CSSBoxProperty] = {
                num: undefined,
                unit: '',
                value: '#000000',
            };
        });
    } else {
        state[type] = createBoxState();
        SIDES.forEach((side) => {
            state[`${type}${side}` as CSSBoxProperty] = createBoxState();
        });
    }

    return state;
};

const hasBorderWidth = (borderState: BoxState | undefined): boolean => {
    if (!borderState) return false;

    if (borderState.unit === 'px') {
        return typeof borderState.num === 'number' && borderState.num > 0;
    }
    return borderState.value !== '--' && borderState.value !== '' && borderState.value !== '0px';
};

export const useBoxControl = (type: BoxType) => {
    const editorEngine = useEditorEngine();

    const getInitialState = useMemo(() => {
        const defaultState = createDefaultState(type);
        const computedStyles = editorEngine.style.selectedStyle?.styles.computed;

        if (!computedStyles) return defaultState;

        if (type === 'radius') {
            const radiusValue = computedStyles.borderRadius?.toString() ?? '--';
            const { num, unit } = stringToParsedValue(radiusValue);
            defaultState.borderRadius = createBoxState(num, unit);

            CORNERS_RADIUS.forEach((corner) => {
                const cssProperty = `border${corner}` as CSSBoxProperty;
                const { num, unit } = stringToParsedValue(
                    computedStyles[cssProperty]?.toString() ?? radiusValue
                );
                defaultState[cssProperty] = createBoxState(num, unit);
            });
        } else if (type === 'border') {
            const borderValue = computedStyles.borderWidth?.toString() ?? '--';
            const { num, unit } = stringToParsedValue(
                borderValue
            );
            defaultState.borderWidth = createBoxState(num, unit);

            SIDES.forEach((side) => {
                const widthProperty = `border${side}Width` as CSSBoxProperty;
                const { num, unit } = stringToParsedValue(
                    computedStyles[widthProperty]?.toString() ?? borderValue
                );
                defaultState[widthProperty] = createBoxState(num, unit);

                const colorProperty = `border${side}Color` as CSSBoxProperty;
                defaultState[colorProperty] = {
                    num: undefined,
                    unit: '',
                    value: computedStyles[colorProperty]?.toString() ?? '#000000',
                };
            });
        } else {
            const value = computedStyles[type]?.toString() ?? '--';
            const { num, unit } = stringToParsedValue(value);
            defaultState[type] = createBoxState(num, unit);
            SIDES.forEach((side) => {
                const cssProperty = `${type}${side}` as CSSBoxProperty;
                const { num, unit } = stringToParsedValue(
                    computedStyles[cssProperty]?.toString() ?? value
                );
                defaultState[cssProperty] = createBoxState(num, unit);
            });
        }

        return defaultState;
    }, [editorEngine.style.selectedStyle, type]);

    const [boxState, setBoxState] = useState<BoxStateMap>(getInitialState);
    const [borderExists, setBorderExists] = useState(false);

    useEffect(() => {
        setBorderExists(hasBorderWidth(boxState.borderWidth));
    }, [boxState.borderWidth]);

    useEffect(() => {
        setBoxState(getInitialState);
    }, [getInitialState]);

    const handleBoxChange = useCallback((property: CSSBoxProperty, value: string) => {
        const parsedValue = value === '--' ? undefined : value;
        const currentState = boxState[property];

        if (!currentState) return;

        const cssValue = parsedValue ? `${parsedValue}${currentState.unit}` : '';
        const updates = new Map<CSSBoxProperty, string>();

        updates.set(property, cssValue);

        if (type === 'radius' && property === 'borderRadius') {
            CORNERS_RADIUS.forEach((corner) => {
                updates.set(`border${corner}` as CSSBoxProperty, cssValue);
            });
        } else if (type === 'border' && property === 'borderWidth') {
            SIDES.forEach((side) => {
                updates.set(`border${side}Width` as CSSBoxProperty, cssValue);
            });
        } else if ((type === 'margin' || type === 'padding') && property === type) {
            SIDES.forEach((side) => {
                updates.set(`${type}${side}` as CSSBoxProperty, cssValue);
            });
        }

        editorEngine.style.updateMultiple(Object.fromEntries(updates));
    }, [boxState, editorEngine.style, type]);

    const handleUnitChange = useCallback((property: CSSBoxProperty, unit: string) => {
        const currentState = boxState[property];

        if (!currentState) return;

        if (currentState.num !== undefined) {
            editorEngine.style.update(property, `${currentState.num}${unit}`);
        }
    }, [boxState, editorEngine.style]);

    const handleIndividualChange = useCallback((value: number, side: string) => {
        const property = type === 'radius'
            ? (`border${capitalizeFirstLetter(side)}Radius` as CSSBoxProperty)
            : type === 'border'
                ? (`border${capitalizeFirstLetter(side)}Width` as CSSBoxProperty)
                : (`${type}${capitalizeFirstLetter(side)}` as CSSBoxProperty);

        const currentState = boxState[property];
        if (!currentState) return;

        const newValue = `${value}${currentState.unit}`;

        // Update CSS
        editorEngine.style.update(property, newValue);

    }, [boxState, editorEngine.style, type]);

    return {
        boxState,
        borderExists,
        handleBoxChange,
        handleUnitChange,
        handleIndividualChange,
    };
};
