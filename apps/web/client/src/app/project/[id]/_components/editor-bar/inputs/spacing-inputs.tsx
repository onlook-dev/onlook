import type { BoxType } from '../hooks/use-box-control';
import { useInputControl } from '../hooks/use-input-control';
import { InputIcon } from './input-icon';

type IconType =
    | 'LeftSide'
    | 'TopSide'
    | 'RightSide'
    | 'BottomSide'
    | 'CornerTopLeft'
    | 'CornerTopRight'
    | 'CornerBottomLeft'
    | 'CornerBottomRight';

interface SpacingInputsProps {
    type: BoxType;
    values: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
        topLeft?: number;
        topRight?: number;
        bottomRight?: number;
        bottomLeft?: number;
    };
    onChange: (value: number, side: string) => void;
}

type IconMap = Record<string, IconType>;

const getIconNames = (type: BoxType): IconMap => {
    if (type === 'radius') {
        return {
            topLeft: 'CornerTopLeft',
            topRight: 'CornerTopRight',
            bottomRight: 'CornerBottomRight',
            bottomLeft: 'CornerBottomLeft',
        };
    }
    return {
        left: 'LeftSide',
        top: 'TopSide',
        right: 'RightSide',
        bottom: 'BottomSide',
    };
};

export const SpacingInputs = ({ type, values, onChange }: SpacingInputsProps) => {
    const icons = getIconNames(type);
    const positions =
        type === 'radius'
            ? ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']
            : ['left', 'top', 'right', 'bottom'];

    return (
        <div className="grid grid-cols-2 gap-2">
            {positions.map((pos) => (
                <InputIcon
                    key={pos}
                    icon={icons[pos]}
                    value={values[pos as keyof typeof values] ?? 0}
                    onChange={(value) => onChange(value, pos)}
                />
            ))}
        </div>
    );
};
