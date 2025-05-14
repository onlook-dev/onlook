'use client';

import { Border } from './dropdowns/border';
import { ColorBackground } from './dropdowns/color-background';
import { Height } from './dropdowns/height';
import { ImageBackground } from './dropdowns/img-background';
import { ImgFit } from './dropdowns/img-fit';
import { Margin } from './dropdowns/margin';
import { Padding } from './dropdowns/padding';
import { Radius } from './dropdowns/radius';
import { StateDropdown } from './dropdowns/state-dropdown';
import { Width } from './dropdowns/width';
import { ViewButtons } from './panels/panel-bar/bar';
import { InputSeparator } from './separator';

export const ImgSelected = () => {
    return (
        <div className="flex items-center gap-1">
            <StateDropdown />
            <InputSeparator />
            <Width />
            <InputSeparator />
            <Height />
            <InputSeparator />
            <Padding />
            <InputSeparator />
            <Margin />
            <InputSeparator />
            <Radius />
            <InputSeparator />
            <ImgFit />
            <InputSeparator />
            <Border />
            <InputSeparator />
            <ColorBackground />
            <InputSeparator />
            <ImageBackground />
            <ViewButtons />
        </div>
    );
};
