import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { memo } from 'react';
import ColorInput from '../single/ColorInput';

const FillInput = ({ compoundStyle }: { compoundStyle: CompoundStyleImpl }) => {
    return (
        <div className="flex flex-row items-center mt-2">
            <p className="text-xs w-24 mr-2 text-start text-foreground-onlook">
                {compoundStyle.key}
            </p>
            <div className="text-end ml-auto">
                <ColorInput elementStyle={compoundStyle.head} compoundStyle={compoundStyle} />
            </div>
        </div>
    );
};
FillInput.displayName = 'FillInput';

export default memo(FillInput);
